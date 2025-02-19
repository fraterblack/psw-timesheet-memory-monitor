const { exec } = require("child_process");

const MEMORY_LIMIT = 8000;

function checkMemoryUsage() {
    exec("pm2 jlist", (err, stdout) => {
        if (err) {
            console.error("[x] Erro ao obter lista do PM2:", err);
            return;
        }

        const processes = JSON.parse(stdout);
        let totalMemory = 0;
        let maxMemoryProcess = null;

        processes.forEach(proc => {
            if (proc.name == 'psw-timesheet' && proc.monit && proc.monit.memory) {
                // console.log(`   Processo ${proc.name}: ${(proc.monit.memory / 1024 / 1024).toFixed(2)} MB`);
                totalMemory += proc.monit.memory / 1024 / 1024; // Convert to MB
                if (!maxMemoryProcess || proc.monit.memory > maxMemoryProcess.monit.memory) {
                    maxMemoryProcess = proc;
                }
            }
        });

        console.log(`= Memória total usada: ${totalMemory.toFixed(2)} MB (Limite: ${MEMORY_LIMIT}MB)`);

        if (totalMemory > MEMORY_LIMIT && maxMemoryProcess) {
            console.log(`[!] Reiniciando processo com maior consumo: ${maxMemoryProcess.name}`);
            exec(`pm2 restart ${maxMemoryProcess.pm_id}`);
        }
    });
}

setInterval(checkMemoryUsage, 5000);
