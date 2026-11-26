#!/usr/bin/env node
/** Antes de levantar VPS: jamás imprime la contraseña ni el hash. */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const file=process.argv[2]||'.env.vps';
const fail=(message)=>{console.error('ERROR VPS: '+message);process.exitCode=1;};
if(!fs.existsSync(file)){fail('Falta '+file+'; copia .env.vps.example y complétalo en privado.');process.exit();}
const stat=fs.statSync(file);
if(process.platform!=='win32'&&(stat.mode&0o077)!==0)fail('Permisos inseguros. Ejecuta: chmod 600 '+file);
const input=fs.readFileSync(file,'utf8');
const env={};
for(const line of input.split(/\r?\n/)){
 const trimmed=line.trim();
 if(!trimmed||trimmed.startsWith('#'))continue;
 const match=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(trimmed);
 if(!match){fail('Línea de entorno mal formada; comprueba las comillas.');continue;}
 let value=match[2].trim();
 if((value.startsWith("'")&&value.endsWith("'"))||(value.startsWith('"')&&value.endsWith('"')))value=value.slice(1,-1);
 env[match[1]]=value;
}
const domain=env.CRM_DOMAIN||'';
const hostname=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
if(!hostname.test(domain)||/example|localhost|\.invalid$/i.test(domain))fail('CRM_DOMAIN debe ser un subdominio real autorizado, apuntando al VPS.');
const mail=env.CRM_ACME_EMAIL||'';
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||/example/i.test(mail))fail('CRM_ACME_EMAIL debe ser un correo real de la empresa.');
if(!/^[a-z0-9_.-]{4,48}$/i.test(env.CRM_GATE_USER||'')||/cambiar|admin$|test/i.test(env.CRM_GATE_USER||''))fail('CRM_GATE_USER debe ser único y no el ejemplo.');
const hash=env.CRM_GATE_PASSWORD_HASH||'';
if(!/^\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}$/.test(hash))fail('CRM_GATE_PASSWORD_HASH debe ser bcrypt válido (60 caracteres).');
if(process.exitCode)process.exit(process.exitCode);
console.log('OK: configuración estructural de VPS preview validada (sin revisar DNS, HTTPS ni credenciales).');
console.log('Dominio: '+domain+' | Modo: PRUEBAS, sin datos reales');
