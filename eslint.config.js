import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', '.test-dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  { files: ['**/*.ts', '**/*.tsx'], languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
);
