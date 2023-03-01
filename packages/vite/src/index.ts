/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Plugin } from 'vite'
import { transform } from '@babel/core'

export function prpc(): Plugin {
  return {
    enforce: 'pre',
    name: 'prpc',
    transform(code: string, id: string) {
      if (
        (id.endsWith('.ts') && code.includes('query$(')) ||
        code.includes('mutation$(')
      ) {
        // const bCode = code.includes('import server$')
        //   ? code
        //   : `import server$ from "solid-start/server";\n${code}`
        const transformed = transform(code, {
          presets: ['solid', '@babel/preset-typescript'],
          plugins: [transformpRPC$],
          filename: id,
        })
        if (transformed) {
          // console.log('transformed.code', transformed.code)
          return transformed.code
        }
      }
      return null
    },
  }
}

function transformpRPC$({ types: t }: { types: any }) {
  return {
    visitor: {
      Program(path: any) {
        const serverImport = path.node.body.find(
          (node: any) =>
            node.type === 'ImportDeclaration' &&
            node.source.value === 'solid-start/server'
        )
        if (!serverImport) {
          path.node.body.unshift(
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier('server$'))],
              t.stringLiteral('solid-start/server')
            )
          )
        }
      },
      CallExpression(path: any) {
        const { callee } = path.node

        if (
          t.isIdentifier(callee, { name: 'query$' }) ||
          t.isIdentifier(callee, { name: 'mutation$' })
        ) {
          const [serverFunction, key, zodSchema] = path.node.arguments
          serverFunction.body.body.forEach((body: any) => {
            if (
              body.expression &&
              body.expression.object &&
              body.expression.object.name === 'request$'
            ) {
              body.expression.object.name = 'server$.request'
            }
          })
          if (zodSchema) {
            serverFunction.body.body.unshift(t.identifier('.parse(payload)'))
            serverFunction.body.body.unshift(zodSchema)
            path.node.arguments.pop()
          }

          const wrappedArg = t.callExpression(t.identifier('server$'), [
            t.arrowFunctionExpression(
              serverFunction.params,
              serverFunction.body
            ),
          ])
          const newCallExpr = t.callExpression(callee, [wrappedArg, key])
          path.replaceWith(newCallExpr)
          path.skip()
        }
      },
    },
  }
}
