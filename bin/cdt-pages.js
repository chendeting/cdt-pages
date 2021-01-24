#!/usr/bin/env node
process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('../lib')) // require去寻找模块，resolve去对应的找路径
require('gulp/bin/gulp')

// console.log(process.argv)