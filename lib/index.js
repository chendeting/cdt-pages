// 实现这个项目的构建任务 gulp 的入口文件
const del = require('del')

// watch监视某一个通配符，监听其变化， series串行，执行有先后顺序， parallel并行，一起执行
const {src, dest, parallel, series, watch} = require('gulp')
/**
 * 插件库，自动加载插件
 *
 * **/
const loadPlugins = require('gulp-load-plugins')

// plugins 是一个对象
const plugins = loadPlugins()
/**
 * browserSync ,热更新插件
 *
 * */
const browserSync = require('browser-sync')

const bs = browserSync.create()

/**
 *
 * 手动导入插件
 * **/
// const sass = require('gulp-sass') // scss 编译
// const babel = require('gulp-babel') // es6 编译
// const swig = require('gulp-swig') // 页面模版 编译
// const imagemin = require('gulp-imagemin') // 图片压缩 编译


const cwd = process.cwd()
let config = {
    // default config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**',
        }
    }
}
   try { // 配置寻找动态配置数据data
     const loadConfig = require(`${cwd}/pages.config.js`)
       config = Object.assign({}, config, loadConfig)
   } catch (e) {
}
// 清除目录
const clean = () => {
    // temp 是零时目录，最终结果为dist目录
    return del([config.build.dist, config.build.temp])
}

// 样式编译任务
const style = () => {
    // base 为基准路径，即为src下面文件的原有格式保持一致, cwd为工作目录
    return src(config.build.paths.styles, {base: config.build.src, cwd: config.build.src}) // 获取到文件
        .pipe(plugins.sass({outputStyle: 'expanded'})) // 只会转换没有下划线的sass文件,outputStyle指定转换后的格式，为全展开
        .pipe(dest(config.build.temp)) // 写入到目标位置
    // .pipe(bs.reload({stream: true})) // 变化时去更新浏览器，以文件流方式推到浏览器，如果bs.init里面的files没有添加，这需要添加这个通道，不然浏览器无变化
}
// js编译任务

const script = () => {
    return src(config.build.paths.scripts, {base: config.build.src, cwd: config.build.src})
        .pipe(plugins.babel({presets: [require('@babel/preset-env')]})) // 给babel设置presets，插件集合
        .pipe(dest(config.build.temp))
}

// 页面编译任务

const page = () => {
    return src(config.build.paths.pages, {base: config.build.src, cwd: config.build.src}) // **/*.html 标示在src下任何子目录下的html文件
        .pipe(plugins.swig({data: config.data, cache: false})) // 页面有可能因为swig模版引擎缓存的机制导致页面不会发生变化，此时就需要将swig选项重的cache设置为false
        .pipe(dest(config.build.temp))
}

// 图片字体转换编译任务

const images = () => {
    return src(config.build.paths.images, {base: config.build.src, cwd: config.build.src}) // **/*.html 标示在src下任何子目录下的html文件
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const font = () => {
    return src(config.build.paths.fonts, {base: config.build.src, cwd: config.build.src}) // **/*.html 标示在src下任何子目录下的html文件
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// 额外的文件比如public,通过拷贝的方式，拷贝过去

const extra = () => {
    return src('**', {base: config.build.public, cwd: config.build.public})
        .pipe(dest(config.build.dist))
}

const server = () => {
    watch(config.build.paths.styles, {cwd: config.build.src}, style)
    watch(config.build.paths.scripts, {cwd: config.build.src}, script)
    watch(config.build.paths.pages, {cwd: config.build.src}, page)
    // 开发阶段去请求原路径的图片，以减少编译任务，提高一部分构建效率
    // watch('src/assets/images/**', images)
    // watch('src/assets/fonts/**', font)
    // watch('public/**', extra)
    // 这些文件发生变化后，浏览器重新load
    watch([config.build.paths.images, config.build.paths.fonts], {cwd: config.build.src}, bs.reload)

    watch('**', {cwd: config.build.public}, bs.reload)

    bs.init({
        notify: false, // 关掉提示信息
        port: 8888, // 设置端口
        open: true, // 自动打开浏览器，默认为true， 设置为false，则默认不自动打开浏览器
        files: config.build.temp + '/**', // 通过通配符指定哪些文件修改后自动编译，如果不使用files属性，那么就需要在每个任务后面去添加内容修改后的更新面积浏览器的更新bs.reload
        server: {
            // 支持数组，先从第一个开始找，依次往后
            // baseDir: 'dist',
            baseDir: [config.build.temp, config.build.dist, config.build.public], // 开发阶段去请求寻找图片，从源文件去找，可以减少编译任务
            routes: { // 先找routes下的路径，然后在找baseDir下的路径，路由映射
                '/node_modules': 'node_modules'
            }
        }
    })
}
// 需要先执行compile 才能执行useref，因为先执行useref，会把注释给删除掉，后面在压缩就没效果
const useref = () => {
    return src(config.build.paths.pages, {base: config.build.temp, cwd: config.build.temp})
        .pipe(plugins.useref({searchPath: [config.build.temp, '.']}))
        // html, js, css 分别压缩
        .pipe(plugins.if(/\.js$/, plugins.uglify())) // js 压缩
        .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // css 压缩
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true, // 配置删除掉空白字符
            minifyCSS: true, // 配置压缩css文件，删除空白行
            minifyJS: true // 配置压缩js文件，删除空白行
        }))) // html 压缩
        .pipe(dest(config.build.dist)) // 压缩后的代码放到dist目录
}


// 组合任务, 同时并行执行 这个任务的编译
const compile = parallel(style, script, page)
// 先执行clean, 再去编译, 上线之前的编译
const build = series(
    clean,
    parallel( // 并行任务
        series(compile, useref), // 串行任务
        images,
        font,
        extra)
)
// 开发阶段的编译
const develop = series(compile, server)

// module.exports = {
//   clean,
//   compile,
//   build,
//   develop,
//   server,
//   useref
// }
//只有这些才需要导出
module.exports = {
    server,
    clean,
    build,
    develop
}
