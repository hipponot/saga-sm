import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
})

const eslintConfig = [
    js.configs.recommended,
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default eslintConfig