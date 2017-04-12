module.exports = [{
    data:{
        laravel:true
    },
    output:{
        filename:'laravel_footer.blade.php',
        path:'dist'
    },
    beforeRender:function(content,cb){
        cb(content)
    }
},{
    data:{
        laravel:false
    },
    output:{
        filename:'discuz_footer.blade.php',
        path:'dist'
    }
}]