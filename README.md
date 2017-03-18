# kfc_module_creator
```
执行npm install  
执行gulp
```

虽然现在都提倡前后端分离、node同构直出，但是在很多公司的旧项目中，基于php的mvc框架项目仍然很多。在这种项目中，前端人员需要围绕其中的view层进行开发，一些业务数据直接在模板中获取。
 下面举一个例子，后台采用laravel框架，前端模版引擎为blade模板。现在需要编写一个模版，这个模板有以下逻辑：如果用户已经登录，提示已经登录，否则提示未登录。
```
 <!--index.blade.php（laravel的模板文件以blade.php作为后缀）-->
...
    @if(Auth::check())
         <h1>已经登录</h1>
    @else
          <h1>未登录</h1>
    @endif
...
```
嗯，看上去除了增加blade引擎的模板语法外，其它跟写法跟原生前端写法并无差别。  由于嵌套了blade语法，导致这部分代码只能被blade模板引擎解析，无法被其它项目共用。当别的项目需要实现相同的页面时，只能另外写一套。比如在discuz（开源的论坛框架）的页面中，要实现上述例子，需要这样写：
```
<!--index.htm（discuz的模板文件以htm作为后缀）-->
...
     <!--{if $_G['uid']}-->
         <h1>已经登录</h1>
    <!--{else}-->
          <h1>未登录</h1>
    <!--{/if}-->
...
```
所以当一个项目存在几种模板引擎后，要实现模板的共用就成了一个大的问题，因为每个模板引擎有不同的模板语法。比如[金蝶社区](http://club.kingdee.com/ "金蝶社区")，金蝶社区这个项目，一部分页面用了laravel框架，一部分页面用了discuz。在不同模板引擎中，有一些模版是重复出现的，比如顶部导航栏、footer等。由于业务需求不断在变动，这些模块一直在改变，如果仍然按照blade、discuz的语法写两套，维护起来势必非常麻烦。



![](http://upload-images.jianshu.io/upload_images/2439144-1e1a77f4afe59d9b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)





我们也做了一些尝试，比如：
####采用js生成html的方式
这种方式的前提是需要我们剔除后台的模板语法，这样才能被浏览器识别。然而在js中无法直接获取后台数据，只能采用数据接口的方式异步请求、或者在html嵌入隐藏的input标签，通过id获取input中的值来获取后台数据。然而这两种方式对原有代码的改动非常大，还丧失了模板语法的优势，需要额外写dom操作，并会有种内容加载很慢的感觉（js未引入，相关内容就不会被渲染）。

####优雅的解决方案  
为了实现跨项目的模版同步，我们在原有架构外增加了一个生成器。


![](http://upload-images.jianshu.io/upload_images/2439144-3bff989f78b540f8.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


我们设计了一个模板生成器，我们对它的期望是，在不改变原有的项目结构前提下，生成符合相应模板语法的模板。它以一个源模板作为输入，并输出其他项目模板语法的模板。前端人员只需要编写源模板，即可借助构建工具生成编译后的模板，并同步到项目中。

那具体怎么实现呢？下面还是以上面提到的例子作为讲解。
首先在源模板文件上，应该具有如下特点：
#####可以根据不同的模板环境生成不同的模板#####

可能有点抽象，直接上代码，应该就会清晰明了了
```
 <!--源模板 demo.html-->
...
    **laravel?`@if(Auth::check())`:`<!--{if $_G['uid']}-->`**
    <h1>已经登录</h1>
    **laravel?`@else`:`<!--{else}-->`**
    <h1>未登录</h1>
    **laravel?`@else`:`<!--{else}-->`**

...
```


![](http://upload-images.jianshu.io/upload_images/2439144-e435160eb0d019a2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
可能你看到这里就有点疑惑，**号之间的内容是什么鬼？如果去除星号后，你会发现这是一个三元运算表达式！当laravel变量为true时返回字符串@if(Auth::check())，否则返回<!--{if $_G['uid']}-->，这样的话，源模板就可以根据里面的变量值生成相应的模板啦。
那你可能又会疑惑，怎么把这个变量传进去呢？  
这里我们要写一个renderTemplate方法：
```
@str:读取文件生成的字符串
@data:传递进去的变量
@callback:回调函数，其中第一个参数就是编译后的字符串
const renderTemplate = function(str,data,callback){
    var a = str.replace(/\*\*(.*?)\*\*/g,function(res){//获取包括**的内容
        var result = arguments[1]
        //result匹配了**之间的内容
        try{
            with(data){
                var rel = eval(result)
                //把字符串当作表达式输出，并用with修改作用域
                return rel
            }
        }catch(e){
            console.log(e)
            //捕获异常
        }
    })
    callback&&callback(a)
}
```
原理就是用正则匹配出**号的内容，并将里面的字符串当作表达式执行。  因而出了三元表达式，立即执行的匿名函数也可以正常执行。比如：
```
...
**(function(){ return 'david'})()**
...
```
会输出
```
...
david
...
```


那renderTemplate具体怎么调用呢？
让我们写一个node脚本：
```
//index.js
const {readFileSync,writeFile} = require('fs')
var file ='/Users/david/demo.html' //文件绝对路径
var content = readFileSync(file,'utf-8')//同步读取文件
renderTemplate(content,{laravel:true},function(html){
    console.log(html)//接下来就应该做文件保存工作啦
})
renderTemplate(content,{laravel:false},function(html){
    console.log(html)//接下来就应该做文件保存工作啦
})
```
在执行node index.js后，如无意外，你会在控制台得到两条输出

![控制台截图](http://upload-images.jianshu.io/upload_images/2439144-e98ed727a84bdd06.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)  
现在的基本逻辑已经跑通啦，剩下的就是文件存储的操作啦。  


###进阶使用  
以上只是一个简单的demo，每一个demo都要写对应的脚本逻辑才能用于实际项目中。在实际情况中，我们希望前端专注在源模板的编写上，所以我们把node脚本进行封装。由于模板生成后的路径、文件名不定、所以我们要把这一块设置从脚本中分离出来，针对具体的源模板配置。  

下面是我分离后的目录结构：  
![目录结构](http://upload-images.jianshu.io/upload_images/2439144-3c1ac70e1a16353e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

dist：源模板输出目录
node_modules:模块依赖目录
template:源模板目录，针对每一个源模板，配置有一个config.js和index.html
其中config.js是该源模板的相关配置参数。下面会详细提到。
index.html是源模板文件
gulpfile.js是gulp的入口文件
package.json项目相关配置信息   

首先查看gulpfile.js
```
const gulp = require('gulp')
const watch = require('gulp-watch')
const {readFileSync,writeFile} = require('fs')
const path = require('path')
gulp.task('default',['build'])
const renderTemplate = function(str,data,callback){
    var a = str.replace(/\*\*(.*?)\*\*/g,function(res){//获取包括**的内容
        var result = arguments[1]
        //result匹配了**之间的内容
        try{
            with(data){
                var rel = eval(result)
                //把字符串当作表达式输出，并用with修改作用域
                return rel
            }
        }catch(e){
            console.log(e)
            //捕获异常
        }
    })
    callback&&callback(a)
}

gulp.task('build',()=>{
    watch('template/**/*.html',{ ignoreInitial: false },function(event) {
        let file = event.path//文件变动路径
        const content = readFileSync(file,'utf-8')//同步读取文件
        const config = require(path.resolve(file,'../config.js'))//获取同级目录下的config文件
        config.forEach(item=>{
            renderTemplate(content,item.data,function(str){
                writeFile(path.resolve(item.output.path,item.output.filename),str,function(err){
                    if(err){
                        console.log(err)//有错误输出错误
                        process.exit()
                    }
                    console.log('File ' + item.output.filename + '编译成功');
                })
            })
        })
    });
})
```
里面的注释应该很清楚了，然后查看demo中的config.js
```
module.exports = [{
    data:{
        laravel:true
    },
    output:{
        filename:'laravel_demo.blade.php',
        path:'dist'
    }
},{
    data:{
        laravel:false
    },
    output:{
        filename:'discuz_demo.blade.php',
        path:'dist'
    }
}]
```
这个模块实际上返回了一个数组，数组中的每一个对象对应输出的相关配置。data即renderTemplate的data参数。output则记录了输出的文件名和路径。（注意：这里的path最好写成绝对路径）

在脚本执行后，应该会生成两个模板，一个为"laravel_demo.blade.php",一个为"discuz_demo.blade.php".

####项目github地址
https://github.com/David-zzg/kfc_module_creator  

####结语 
至此，最核心的基本功能已经完成了。然而，这并不意味着结束。在我们引入构建工具的同时，node已经为我们打开一扇大门。我们可以在模板的基础上再加些额外处理。比如压缩文件、比如引入posthtml-bem实现css的命名管理等等！

####最后说一句  
这是我第一次写技术类的博客，如有错误之处，请大大们指出！只有写过技术博客后，我才真正理解到写技术博客的艰辛！致敬各位写博客的大大们！
