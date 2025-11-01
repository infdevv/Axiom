const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const sourceDir = path.join(__dirname, 'frontend', 'eta_unob');
const outputDir = path.join(__dirname, 'frontend', 'eta');

const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: false, 
    deadCodeInjection: false,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false
};

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory ${sourceDir} does not exist!`);
    console.log('Please create frontend/eta_unob/ and put your unobfuscated files there.');
    process.exit(1);
}

fs.readdirSync(sourceDir).forEach(file => {
    if (path.extname(file) === '.js') {
        const sourcePath = path.join(sourceDir, file);
        const outputPath = path.join(outputDir, file);

        console.log(`Obfuscating ${file}...`);

        try {
            const sourceCode = fs.readFileSync(sourcePath, 'utf8');
            const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscatorOptions);

            fs.writeFileSync(outputPath, obfuscationResult.getObfuscatedCode());
            console.log(`${file} obfuscated successfully`);
        } catch (error) {
            console.error(`Error obfuscating ${file}:`, error.message);
        }
    }
});

console.log('\nBuild complete!');
