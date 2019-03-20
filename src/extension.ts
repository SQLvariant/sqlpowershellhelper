'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as sqlops from 'sqlops';
import * as fs from 'fs-extra';
import * as path from 'path';

// The module 'sqlops' contains the Azure Data Studio extensibility API
// This is a complementary set of APIs that add SQL / Data-specific functionality to the app
// Import the module and reference it with the alias sqlops in your code below

import { spawn, ExecOptions, SpawnOptions, ChildProcess } from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "sqlpowershellhelper" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('extension.installSqlPowershell', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        installSqlPowershell(context).catch((err) => vscode.window.showErrorMessage(`Unexpected error ${err.message} during powershell setup`));
        // let childProcess = spawn('powershell', ['try {Import-Module SqlServer -ErrorAction Stop} catch {Install-Module SqlServer} finally {Import-Module SqlServer}']);
        // childProcess.on('error', (error)  => vscode.window.showErrorMessage('got error' + error + ' from powershell'));
        // childProcess.on('exit', (status, info)  => {
        //     if (status !== 0) {
        //         vscode.window.showErrorMessage(`Powershell exited with code ${status}, error ${info}`);
        //     } else {
        //         vscode.window.showInformationMessage('SQL Powershell module was installed!');
        //     }
        // });
        // childProcess.stdout.on('data', (data) => vscode.window.showInformationMessage('got message' + data + ' from powershell'));
        // childProcess.stderr.on('data', (data) => vscode.window.showErrorMessage('got error' + data + ' from powershell'));
    }));
}

async function installSqlPowershell(context: vscode.ExtensionContext): Promise<void> {
    let result = await execProcess(['try {Import-Module SqlServer -ErrorAction Stop} catch {Install-Module SqlServer} finally {Import-Module SqlServer}']);
    if (result.exitCode !== 0) {
        vscode.window.showErrorMessage(`Powershell exited with code ${result.exitCode}, error ${result.exitMsg}`);
        return;
    } else if (result.stderr.length > 0) {
        vscode.window.showErrorMessage(`Errors occurred during powershell execution: ${result.stderr.join('\n')}`);
        return;
    } else {
        vscode.window.showInformationMessage('SQL Powershell module was installed!');
    }

    // Next call execProcess again to install other things.
    let script = await fs.readFile(path.join(context.extensionPath, 'registerDbArgCompleter.ps'));
    result = await execProcess([script.toString()]);
    if (result.exitCode !== 0) {
        vscode.window.showErrorMessage(`Registering completer  exited with code ${result.exitCode}, error ${result.exitMsg}`);
        return;
    } else if (result.stderr.length > 0) {
        vscode.window.showErrorMessage(`Errors occurred during powershell execution: ${result.stderr.join('\n')}`);
        return;
    } else {
        vscode.window.showInformationMessage('Completer was installed!');
    }

    result = await execProcess(['Get-Module -Name SqlServer']);
    let terminal = vscode.window.createTerminal();
    terminal.sendText('Get-Module -Name SqlServer');
    terminal.show();
}

function execProcess(args: string[], procName: string = 'powershell'): Promise<ShellResult> {
    return new Promise((resolve, reject) => {
        let result: ShellResult = {
            stdout: [],
            stderr: []
        }
        let childProcess = spawn(procName, args);
        childProcess.on('error', (error)  => result.exitMsg = error.message);
        childProcess.on('exit', (status, info)  => {
            result.exitCode = status;
            result.exitMsg = info || result.exitMsg;
            resolve(result);
        });
        childProcess.stdout.on('data', (data) => result.stdout.push(typeof(data) === 'string' ? data : data.toString() ));
        childProcess.stderr.on('data', (data) => result.stdout.push(typeof(data) === 'string' ? data : data.toString() ));
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

interface ShellResult {
    stdout: string[];
    stderr: string[];
    exitCode?: number;
    exitMsg?: string;
}