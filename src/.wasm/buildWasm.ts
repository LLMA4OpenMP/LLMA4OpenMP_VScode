import { ITreeSitterGrammar, ensureWasm } from './compileWasm';

async function compileWasm(outputPath: string) {
    const treeSitterGrammars: ITreeSitterGrammar[] = [
        {
            name: 'tree-sitter-cpp',
        },
        {
            name: 'tree-sitter-c',
        }
    ];

    for (const grammar of treeSitterGrammars) {
        await ensureWasm(grammar, outputPath);
    }
}

compileWasm(process.argv[2] ?? __dirname);