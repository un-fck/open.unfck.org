import type { NextConfig } from 'next'
import { realpathSync } from 'node:fs'
import path from 'node:path'

function commonPath(left: string, right: string) {
    const leftRoot = path.parse(left).root
    const rightRoot = path.parse(right).root
    if (leftRoot !== rightRoot) {
        throw new Error('The project and linked UI package must be on the same volume')
    }
    const leftParts = path.resolve(left).slice(leftRoot.length).split(path.sep)
    const rightParts = path.resolve(right).slice(rightRoot.length).split(path.sep)
    const divergence = leftParts.findIndex((part, index) => part !== rightParts[index])
    const sharedParts = leftParts.slice(0, divergence === -1 ? leftParts.length : divergence)
    return path.join(leftRoot, ...sharedParts)
}

const projectRoot = process.cwd()
const uiPackageRoot = realpathSync(path.join(projectRoot, 'node_modules/@un-eosg/ui'))

// Set to your repository name for GitHub Pages, or '' for custom domain
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// NOTE: use basePath variable for Image src
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
    transpilePackages: ['@un-eosg/ui'],
    turbopack: {
        root: commonPath(projectRoot, uiPackageRoot),
    },
    output: 'export',
    trailingSlash: true,
    basePath: basePath,
    assetPrefix: basePath,
    reactStrictMode: true,
    poweredByHeader: false,
    images: {
        unoptimized: true
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
}

export default nextConfig
