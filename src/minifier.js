// generate abstract syntax tree
import * as acorn from 'acorn';
// validates js code and remove comments and line breaks
import escodegen from 'escodegen';
import fs from 'node:fs';
import ASTHelper from './ast-helper.js';

export default class Minifier {
    #nameMap = new Map();
    #alphabet = Array.from('abcdefghiklmnopqrstuvwxyzABCDEFGHIKLMNOPQRSTUVWXYZ');
    #generateNameIfNotExist(name){
        if(this.#nameMap.has(name)){
            return this.#nameMap.get(name);
        }

        if(!this.#alphabet){
            throw new Error('No more names available!');
        }

        //let newName = this.#alphabet.shift();
        //this.#nameMap.set(name, newName);
        return this.#alphabet.shift();
    }

    #updateNameMap(oldName, newName, { loc: { start } }){
        if(this.#nameMap.has(oldName)){
            const nameMap = this.#nameMap.get(oldName);
            console.log(this.#nameMap);
            nameMap.positions.push(start);
            this.#nameMap.set(oldName, nameMap);
            return;
        }

        this.#nameMap.set(oldName, { newName, positions: [start] });
    }

    #handleDeclaration(declaration){
        const oldName = declaration.name;
        const newName = this.#generateNameIfNotExist(oldName);
        this.#updateNameMap(oldName, newName, declaration);
        declaration.name = newName;
    }

    #traverse(node){
        const astHelper = new ASTHelper();

        astHelper.setVariableDeclarationHook(node => {
            for (const declaration of node.declarations){
                this.#handleDeclaration(declaration.id);
            }
        })
        .setFunctionDeclarationHook(node => {
            this.#handleDeclaration(node.id);
            for (const params of node.params){
                this.#handleDeclaration(params);
            }
        })
        .setIdentifierHook(node => {
            const oldName = node.name;
            const name = this.#nameMap.get(oldName)?.newName;
            if(!name) return;

            this.#updateNameMap(oldName, name, node);
            node.name = name;
        })
        .traverse(node);
    }

    minifyAndReturnMapNames(originalCode){
        const originalAST = acorn.parse(originalCode, { ecmaVersion: 2022, locations: true });
        //console.log("originalAST:", JSON.stringify(originalAST, null, 2));
        //fs.writeFileSync('./demo__ast.json', JSON.stringify(originalAST, null, 2))
        this.#traverse(originalAST);
        //console.log("this.#nameMap:", this.#nameMap);
        const minifiedCode = escodegen.generate(originalAST, {format: { compact : true }});
        console.log(JSON.stringify(originalAST, null, 2));
        console.log(minifiedCode);
        return {
            minifiedCode,
            nameMap: this.#nameMap
        }
    }
}