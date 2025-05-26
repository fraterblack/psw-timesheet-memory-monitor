const { exec } = require("child_process");
const fs = require('fs');

const PSW_TIMESHEET = 'psw-timesheet';
const PSW_COLLECTOR = 'psw-collector';
const PSW_CORE = 'psw-core';

const memoryLimit = {
    [PSW_TIMESHEET]: 8000,
    [PSW_COLLECTOR]: 3000,
    [PSW_CORE]: 3000,
};

const memoryWarning = {
    [PSW_TIMESHEET]: 6000,
    [PSW_COLLECTOR]: 2000,
    [PSW_CORE]: 2000,
};

const version = '1.0.0';

function checkMemoryUsage() {
    exec("pm2 jlist", (err, stdout) => {
        if (err) {
            console.error("[x] Erro ao obter lista do PM2:", err);
            return;
        }

        const processes = JSON.parse(stdout);

        const totalMemory = {};
        const maxMemoryProcess = {};

        const processesToMonitoring = [
            PSW_TIMESHEET,
            PSW_COLLECTOR,
            PSW_CORE,
        ];

        processes.forEach(proc => {
            if (proc.monit && proc.monit.memory) {
                processesToMonitoring.forEach(processName => {
                    if (proc.name === processName) {
                        if (!totalMemory[processName]) {
                            totalMemory[processName] = 0;
                        }

                        totalMemory[processName] += proc.monit.memory / 1024 / 1024;
                        if (!maxMemoryProcess[processName] || proc.monit.memory > maxMemoryProcess[processName].monit.memory) {
                            maxMemoryProcess[processName] = proc;
                        }
                    }
                });
            }
        });

        processesToMonitoring.forEach(processName => {
            console.log(`= [${processName}] Memória total usada: ${totalMemory[processName] || '0'} MB (Alerta: ${memoryWarning[processName]}MB, Limite: ${memoryLimit[processName]}MB)`);

            if (totalMemory[processName] > memoryLimit[processName] && maxMemoryProcess[processName]) {
                exec(`pm2 restart ${maxMemoryProcess[processName].pm_id}`);

                console.log(`[!] ${(new Date()).toISOString()} - [${processName}] Reiniciando processo com maior consumo: ${maxMemoryProcess[processName].pm_id}`);

                const logMessage = `${(new Date()).toISOString()} - [${processName}] Consumo máximo mémoria atingido: ${totalMemory[processName]}. `
                    + `Reiniciando processo com maior consumo: ${maxMemoryProcess[processName].pm_id}\n`;
                try {
                    fs.appendFile('app.log', logMessage, (err) => {
                        if (err) {
                            console.error('[!!!] Erro ao escrever no arquivo de log:', err);
                        }
                    });
                } catch (err) {
                    console.log(`[!!!] Erro ao gravar log ${err.message}`);
                }
            } else if (totalMemory[processName] > memoryWarning[processName] && maxMemoryProcess[processName]) {
                console.log(`[?] ${(new Date()).toISOString()} - [${processName}] Consumo anormal de memória detectado: ${totalMemory[processName]}. `
                    + `Processo com maior consumo: ${maxMemoryProcess[processName].pm_id}`);

                const logMessage = `${(new Date()).toISOString()} - [${processName}] Consumo anormal de memória detectado: ${totalMemory[processName]}. `
                    + `Processo com maior consumo: ${maxMemoryProcess[processName].pm_id}\n`;
                try {
                    fs.appendFile('app.log', logMessage, (err) => {
                        if (err) {
                            console.error('[!!!] Erro ao escrever no arquivo de log:', err);
                        }
                    });
                } catch (err) {
                    console.log(`[!!!] Erro ao gravar log ${err.message}`);
                }
            }
        });
    });
}

setInterval(checkMemoryUsage, 5000);

const logMessage = `${(new Date()).toISOString()} - Monitor iniciado ${version}\n`;
try {
    fs.appendFile('app.log', logMessage, (err) => {
        if (err) {
            console.error('[!!!] Erro ao escrever no arquivo de log:', err);
        }
    });
} catch (err) {
    console.log(`[!!!] Erro ao gravar log ${err.message}`);
}
