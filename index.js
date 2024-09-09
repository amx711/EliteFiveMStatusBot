const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cron = require('node-cron');
const moment = require('moment'); 
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Message, Partials.Channel]
});

const statusUrl = 'https://status.cfx.re/history.json';  // CFX status API

let lastStatus = {};
let statusMessage;    

async function getStatus() {
  const res = await fetch(statusUrl);
  const data = await res.json();

  const services = data.components;  
  let allGood = true;
  const statusMap = {};

  services.forEach(service => {
    const operational = service.status === 'operational';
    statusMap[service.name] = operational ? '✅' : '🛑';
    if (!operational) allGood = false;
  });

  return { statusMap, allGood };
}


function createEmbed(statusMap, allGood) {
  const embed = new EmbedBuilder()
    .setTitle('حالة سيرفرات فايف ام')
    .setThumbnail(config.Thumb)
    .setColor(allGood ? 0x00FF00 : 0xFF0000)
    .addFields({ name: 'الحالة العامة', value: allGood ? '✅ جميع الأنظمة تعمل بشكل صحيح' : '🛑 بعض الأنظمة بها مشاكل' });

  Object.keys(statusMap).forEach(service => {
    embed.addFields({ name: service, value: statusMap[service], inline: true });
  });

  embed.setFooter({ text: `اخر تحديث: ${moment().format('HH:mm:ss DD-MM-YYYY')}` });

  return embed;
}

async function updateEmbedFooter() {
  if (statusMessage) {
    const embed = statusMessage.embeds[0];
    embed.setFooter({ text: `اخر تحديث: ${moment().format('HH:mm:ss DD-MM-YYYY')}` });
    await statusMessage.edit({ embeds: [embed] });
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Dev By Elite Code`);

  const { statusMap, allGood } = await getStatus();
  const embed = createEmbed(statusMap, allGood);

  const channel = client.channels.cache.get(config.ChannelId); 
  statusMessage = await channel.send({ embeds: [embed] });

  cron.schedule('* * * * *', updateEmbedFooter); 
});

client.login(config.Token);
