module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    '@babel/preset-typescript',
    '@babel/preset-react'
  ],
  plugins: [
    'react-native-reanimated/plugin',
    '@babel/plugin-proposal-export-namespace-from',
  ],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
    test: {
      plugins: ['@babel/plugin-transform-runtime']
    }
  },
};
