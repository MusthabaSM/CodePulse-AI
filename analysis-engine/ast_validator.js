const ts = require('typescript');
const fs = require('fs');

const inputFile = process.argv[2];
if (!inputFile || !fs.existsSync(inputFile)) {
    console.error("Input file not provided or does not exist.");
    process.exit(1);
}

const sourceCode = fs.readFileSync(inputFile, 'utf-8');
const sourceFile = ts.createSourceFile('temp.ts', sourceCode, ts.ScriptTarget.Latest, true);

const result = {
    declared_functions: [],
    declared_classes: [],
    declared_variables: [],
    exports: [],
    imports: [],
    inheritance: []
};

function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
        result.declared_functions.push(node.name.text);
        if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            result.exports.push(node.name.text);
        }
    } else if (ts.isClassDeclaration(node) && node.name) {
        result.declared_classes.push(node.name.text);
        if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            result.exports.push(node.name.text);
        }
        if (node.heritageClauses) {
            node.heritageClauses.forEach(clause => {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    clause.types.forEach(t => {
                        if (t.expression && ts.isIdentifier(t.expression)) {
                            result.inheritance.push(`${node.name.text} extends ${t.expression.text}`);
                        }
                    });
                }
            });
        }
    } else if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
                result.declared_variables.push(decl.name.text);
                if (isExported) {
                    result.exports.push(decl.name.text);
                }
            }
        });
    } else if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const modName = node.moduleSpecifier.text;
            result.imports.push(modName);
        }
    } else if (ts.isExportDeclaration(node)) {
         if (node.exportClause && ts.isNamedExports(node.exportClause)) {
             node.exportClause.elements.forEach(el => {
                 result.exports.push(el.name.text);
             });
         }
    }
    
    ts.forEachChild(node, visit);
}

visit(sourceFile);

console.log(JSON.stringify(result));
