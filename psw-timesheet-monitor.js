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
            console.log(`= [${processName}] Memória total usada: ${totalMemory[processName].toFixed(2)} MB (Limite: ${memoryLimit[processName]}MB)`);

            if (totalMemory[processName] > memoryLimit[processName] && maxMemoryProcess[processName]) {
                exec(`pm2 restart ${maxMemoryProcess[processName].pm_id}`);

                console.log(`[!] ${(new Date()).toISOString()} - [${processName}] Reiniciando processo com maior consumo: ${maxMemoryProcess[processName].name} ${maxMemoryProcess[processName].pm_id}`);
                const logMessage = `${(new Date()).toISOString()} - [${processName}] Reiniciando processo com maior consumo: ${maxMemoryProcess[processName].name} ${maxMemoryProcess[processName].pm_id}`;

                try {
                    fs.appendFile('app.log', logMessage, (err) => {
                        if (err) {
                            console.error('Erro ao escrever no arquivo de log:', err);
                        } else {
                            console.log('Log gravado com sucesso!');
                        }
                    });
                } catch (err) {
                    console.log(`[!] Erro ao gravar log ${err.message}`);
                }
            }
        });
    });
}

setInterval(checkMemoryUsage, 5000);
