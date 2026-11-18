// Metro (empacotador do React Native).
// O @react-three/fiber/native faz `require('three')`, que resolve para `three.cjs`. Esse build chama
// `process.emitWarning` no topo do arquivo — função do Node que não existe no React Native — e derruba
// a tela que importa a cena 3D. Aqui `three` passa a apontar sempre para o build ESM (three.module.js).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const THREE_ESM = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: THREE_ESM };
  return (resolverPadrao ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
