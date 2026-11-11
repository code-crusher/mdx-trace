import 'global-jsdom/register'
import React from 'react'
import {createRoot} from 'react-dom/client'
import * as runtime from 'react/jsx-runtime'
import {evaluate} from './index.js'

const baseUrl = new URL('file://' + process.cwd() + '/')

const load = async (value) =>
  (
    await evaluate(
      {value, path: 'test.mdx'},
      {...runtime, baseUrl, providerImportSource: '@mdx-js/react'}
    )
  ).default

const Content = await load('hello')
const Wrapper = (props) => props.children

const container = document.createElement('div')
const errors = []
// Patch console.error to capture React's warnings.
const originalError = console.error
console.error = function (...args) {
  errors.push(args.join(' ').split('\n')[0])
  originalError.apply(console, args)
}
const root = createRoot(container)

root.render(React.createElement(Content, {components: {wrapper: Wrapper}}))

setTimeout(() => {
  root.render(React.createElement(Content, {components: {}}))
}, 100)

setTimeout(() => {
  console.log('html:', container.innerHTML)
  console.log('errors:')
  for (const error of errors) console.log(' -', error)
  process.exit(errors.length > 0 ? 1 : 0)
}, 300)
