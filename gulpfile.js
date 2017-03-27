const gulp = require('gulp')
const watch = require('gulp-watch')
const {readFileSync,writeFile} = require('fs')
const path = require('path')
var map = require('map-stream');
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

Object.prototype.beforeReadFile = function(content,cb){
    cb(content)
}
//判断参数是否是watch模式
const isWatchMode=(arg)=>arg[1]=='--watch'
const buildTask = event=>{
        let file = event.path//文件变动路径
        const content = readFileSync(file,'utf-8')//同步读取文件
        const config = require(path.resolve(file,'../config.js'))//获取同级目录下的config文件
        config.forEach(item=>{
            //前置判断
            item.beforeReadFile(content,function(content){
                renderTemplate(content,item.data,function(str){
                    writeFile(path.resolve(item.output.path,item.output.filename),str,function(err){
                        if(err){
                            console.log(err)//有错误输出错误
                            process.exit()
                        }
                        console.log('File:' + item.output.filename + '编译成功');
                    })
                })
            })
            
        })
}
gulp.task('build',function(){
    //获取cli参数
    var arg = process.argv.slice(2)
    var pattern = 'template/**/*.html'
    if(isWatchMode(arg)){
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