/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const { optimize } = require('svgo');

const iconsFilePath = './src/icons.ts';

const assetTypesConfig = [
    {
        name: 'icons',
        dirname: 'assets',
        typeName: 'IconName',
    },
];

// https://github.com/svg/svgo#built-in-plugins
const svgoConfig = {
    multipass: true,
    js2svg: {
        indent: 2, // string with spaces or number of spaces. 4 by default
        pretty: true, // boolean, false by default
    },
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    removeViewBox: false,
                },
            },
        },
        'prefixIds',
        // it's necessary to remove all dimension tags to allow resizing
        'removeDimensions',
        'removeRasterImages',
        'removeScriptElement',
    ],
};

const optimizeSvgAssets = assetsDirname => {
    const assetsDir = path.join(__dirname, assetsDirname);
    const assetFileNames = fs.readdirSync(assetsDir);

    return assetFileNames
        .map(fileName => ({
            fileName,
            content: fs.readFileSync(path.resolve(assetsDir, fileName)).toString(),
        }))

        .map(({ fileName, content }) => ({
            fileName,
            content: optimize(content, svgoConfig).data,
        }));
};

const getOptimizedAssetTypes = () =>
    assetTypesConfig.map(config => ({
        ...config,
        assets: optimizeSvgAssets(config.dirname),
    }));

const generateIconsFileContent = assetTypesArray => {
    const mappedAssetTypes = assetTypesArray.map(
        ({ name, assets, dirname, typeName }) => `
           export const ${name} = {
            ${assets
                .map(
                    ({ fileName }) =>
                        `${fileName.replace('.svg', '')}: require('../${dirname}/${fileName}')`,
                )
                .join(',')}
        } as const;
        export type ${typeName} = keyof typeof ${name};
       `,
    );

    return `
    // !!! IMPORTANT: This file is autogenerated !!!
    // If you want to add of modify icons please read README.md to find out how to do it

    ${mappedAssetTypes.join('')}
    `;
};

const writeOptimizedAssets = assetTypesArray => {
    assetTypesArray.forEach(({ assets, dirname }) => {
        assets.forEach(({ fileName, content }) =>
            fs.writeFileSync(path.resolve(dirname, fileName), content),
        );
    });
};

(async () => {
    const assetTypes = getOptimizedAssetTypes(assetTypesConfig);

    const iconsFileContent = generateIconsFileContent(assetTypes);

    const prettierConfigPath = await prettier.resolveConfigFile();
    const prettierConfig = {
        ...(await prettier.resolveConfig(prettierConfigPath)),
        parser: 'babel-ts',
    };

    const formattedIconTypesFileContent = await prettier.format(iconsFileContent, prettierConfig);

    fs.writeFileSync(path.resolve(iconsFilePath), formattedIconTypesFileContent);

    writeOptimizedAssets(assetTypes);
})();
