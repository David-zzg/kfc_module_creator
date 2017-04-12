const gulp = require('gulp')
const watch = require('gulp-watch')
const {readFileSync,writeFile,existsSync} = require('fs')
const path = require('path')
const map = require('map-stream');
const colors = require('cli-color');//让终端输出有颜色的语句
const minify = require('html-minifier').minify;
global.rootPath = path.resolve(__dirname)//保存根目录的数值
const f = require('./common.js')
const base = require('./baseConfig')
gulp.task('default',['build'])
const renderTemplate = function(str,data,callback){
    var a = str.replace(/\*\*(.*?)\*\*/mg,function(res){//获取包括**的内容
        var result = arguments[1]
        //result匹配了**之间的内容
        try{
            with(Object.assign({},f,data)){
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

Object.prototype.beforeRender = function(content,cb){
    cb(content)
}
const getContent = function(str,option){
    var result = str
    if(option.compress){
        result = minify(str,{removeComments: false,collapseWhitespace: true,minifyJS:true, minifyCSS:true})
    }
    if(option.head){
        result = option.head+result
    }
    return result
}
//判断参数是否是watch模式
const isWatchMode=(arg)=>arg[2]=='--watch'
const buildTask = event=>{
        let file = event.path//文件变动路径
        const content = readFileSync(file,'utf-8')//同步读取文件
        const config = require(path.resolve(file,'../config.js'))//获取同级目录下的config文件
        config.forEach(item=>{
            //前置判断
            item = Object.assign({},base,item)
            item.beforeRender(content,function(content){
                renderTemplate(content,item.data,function(str){
                    var output = getContent(str,item)
                    writeFile(path.resolve(item.output.path,item.output.filename),output,function(err){
                        if(err){
                            console.log(err)//有错误输出错误
                            process.exit()
                        }
                        console.log(colors.green('File:' + item.output.filename + '编译成功'));
                    })
                })
            })
            
        })
}
gulp.task('build',function(){
    //获取cli参数
    var arg = process.argv.slice(1)
    var pattern = 'template/'+arg[1].slice(1)+'/index.html'
    if(!existsSync(pattern)){
        colors.red.bgWhite('不存在该文件！')
        return
    }
    if(isWatchMode(arg)){
        console.log(colors.blue.bgWhite('开始监听模式：')); 
        watch(pattern,  { ignoreInitial: false },function(file) {
            buildTask(file)
        })
    }else{
        gulp.src(pattern).pipe(
            map(function(file,cb){
                buildTask(file)
                cb(null, file);
            })
        )
    }
})
