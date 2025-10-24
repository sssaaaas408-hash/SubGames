// ========== BOT AUTOMATICO - SERVIDOR NODE.JS ==========
// Este bot roda no servidor e sincroniza automaticamente com cysaw.pw

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// ========== CONFIGURAÇÕES ==========
const SUPABASE_URL = 'https://qcjlrkqmfxvziqyrfhvf.supabase.co';
const SUPABASE_SERVICE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Service Role Key!
const CYSAW_URL = 'https://cysaw.pw';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========== LISTA DE JOGOS PARA SINCRONIZAR ==========
const GAME_CODES = [
    '2120900',  // Exemplo
    '1938090',
    '271590',
    // Adicione mais códigos aqui
];

// ========== FUNÇÃO: BUSCAR MANIFEST DO CYSAW.PW ==========
async function fetchManifestFromCysaw(gameCode) {
    let browser;
    try {
        console.log(`🔍 Buscando manifest: ${gameCode}`);
        
        // Iniciar navegador headless
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Ir para cysaw.pw
        await page.goto(CYSAW_URL, { waitUntil: 'networkidle2' });
        
        // Inserir código do jogo
        await page.type('#gameCode', gameCode); // Ajuste o seletor
        
        // Clicar no botão de download
        await page.click('#downloadBtn'); // Ajuste o seletor
        
        // Esperar o download começar e pegar a URL
        await page.waitForTimeout(3000);
        
        // Interceptar o download e pegar os dados binários
        const downloadUrl = await page.evaluate(() => {
            // Pegar a URL de download gerada pelo site
            return document.querySelector('a[download]')?.href;
        });
        
        if (!downloadUrl) {
            console.log(`❌ Manifest não encontrado: ${gameCode}`);
            return null;
        }
        
        // Baixar o arquivo
        const response = await page.goto(downloadUrl);
        const buffer = await response.buffer();
        
        console.log(`✅ Manifest baixado: ${gameCode} (${buffer.length} bytes)`);
        
        await browser.close();
        return buffer;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar ${gameCode}:`, error.message);
        if (browser) await browser.close();
        return null;
    }
}

// ========== FUNÇÃO: UPLOAD PARA SUPABASE ==========
async function uploadToSupabase(gameCode, fileBuffer) {
    try {
        console.log(`📤 Enviando para Supabase: ${gameCode}.zip`);
        
        const { data, error } = await supabase.storage
            .from('games')
            .upload(`${gameCode}.zip`, fileBuffer, {
                contentType: 'application/zip',
                upsert: true // Sobrescrever se já existir
            });
        
        if (error) {
            console.error(`❌ Erro no upload: ${error.message}`);
            return false;
        }
        
        console.log(`✅ Upload completo: ${gameCode}.zip`);
        return true;
        
    } catch (error) {
        console.error(`❌ Erro ao fazer upload:`, error.message);
        return false;
    }
}

// ========== FUNÇÃO: SINCRONIZAR UM JOGO ==========
async function syncGame(gameCode) {
    console.log(`\n🎮 Sincronizando: ${gameCode}`);
    console.log('─'.repeat(50));
    
    // 1. Buscar do cysaw.pw
    const fileBuffer = await fetchManifestFromCysaw(gameCode);
    
    if (!fileBuffer) {
        console.log(`⚠️ Falha ao buscar ${gameCode}`);
        return false;
    }
    
    // 2. Upload para Supabase
    const success = await uploadToSupabase(gameCode, fileBuffer);
    
    if (success) {
        console.log(`🎉 ${gameCode} sincronizado com sucesso!`);
        return true;
    }
    
    return false;
}

// ========== FUNÇÃO: SINCRONIZAR TODOS OS JOGOS ==========
async function syncAllGames() {
    console.log('\n🤖 BOT INICIADO - SINCRONIZAÇÃO AUTOMÁTICA');
    console.log('═'.repeat(50));
    console.log(`📊 Total de jogos: ${GAME_CODES.length}`);
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═'.repeat(50));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const gameCode of GAME_CODES) {
        const success = await syncGame(gameCode);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('✅ SINCRONIZAÇÃO FINALIZADA');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Falhas: ${failCount}`);
    console.log('═'.repeat(50));
}

// ========== AGENDAR SINCRONIZAÇÃO AUTOMÁTICA ==========
// Sincronizar a cada 6 horas
cron.schedule('0 */6 * * *', () => {
    console.log('\n⏰ Executando sincronização agendada...');
    syncAllGames();
});

// ========== EXECUTAR NA INICIALIZAÇÃO ==========
console.log('🚀 Bot de Sincronização Iniciado!');
console.log('📅 Agendamento: A cada 6 horas');
console.log('🔄 Executando primeira sincronização...\n');

syncAllGames();

// ========== MANTER O PROCESSO ATIVO ==========
process.on('SIGINT', () => {
    console.log('\n👋 Bot encerrado');
    process.exit(0);
});


// ========== PACKAGE.JSON ==========
/*
{
  "name": "subgames-bot",
  "version": "1.0.0",
  "description": "Bot de sincronização automática de manifests",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "node-cron": "^3.0.2"
  }
}
*/


// ========== INSTRUÇÕES DE DEPLOY ==========
/*
📦 OPÇÃO 1: RAILWAY.APP (Gratuito e Fácil)
1. Criar conta em https://railway.app
2. Criar novo projeto → Deploy from GitHub
3. Conectar seu repositório
4. Railway detecta Node.js automaticamente
5. Adicionar variáveis de ambiente:
   - SUPABASE_URL
   - SUPABASE_KEY
6. Deploy automático!

📦 OPÇÃO 2: RENDER.COM (Gratuito)
1. Criar conta em https://render.com
2. New → Background Worker
3. Conectar repositório GitHub
4. Build Command: npm install
5. Start Command: npm start
6. Adicionar variáveis de ambiente
7. Deploy!

📦 OPÇÃO 3: HEROKU
1. Criar conta em https://heroku.com
2. heroku create subgames-bot
3. git push heroku main
4. heroku config:set SUPABASE_URL=xxx
5. heroku config:set SUPABASE_KEY=xxx

📦 OPÇÃO 4: VPS (DigitalOcean, AWS, etc)
1. SSH no servidor
2. git clone seu-repositorio
3. npm install
4. npm install -g pm2
5. pm2 start bot.js
6. pm2 startup
7. pm2 save

🎯 MELHOR OPÇÃO: Railway.app
- Totalmente gratuito
- Deploy em 2 minutos
- Logs em tempo real
- Reinicia automaticamente
*/


// ========== ALTERNATIVA: SERVERLESS COM VERCEL ==========
/*
Se quiser uma solução ainda mais simples, posso criar uma 
função serverless que roda no Vercel (totalmente gratuito):

1. Cria uma API em /api/sync.js
2. Configura um cron job para chamar essa API
3. A API sincroniza os manifests automaticamente
4. Zero configuração de servidor!

Quer que eu crie essa versão serverless?
*/
