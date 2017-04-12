//允许用户自定义函数，并在模板中使用
module.exports = {
    getTemplate:function(content){
        return '由函数getTemplate生成的'+content
    }
}