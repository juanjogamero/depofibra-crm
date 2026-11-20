import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, Inbox, ShieldCheck, X } from 'lucide-react';
import { dateText } from './domain';

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'neutral';
export function toneFor(status:string):Tone {
  if (/Aceptad|Entregad|Pagad|verificado/i.test(status)) return 'green';
  if (/Nueva|Enviado|tránsito|fabricación/i.test(status)) return 'blue';
  if (/Pendiente|presupuestar|Seguimiento|Confirmando|Preparado|Parcial/i.test(status)) return 'amber';
  if (/Perdida|Rechazado|vencid/i.test(status)) return 'red';
  return 'neutral';
}
export function Pill({ children, tone='neutral' }:{children:ReactNode;tone?:Tone}){return <span className={'pill pill-'+tone}>{children}</span>}
export function Status({value}:{value:string}){return <span className={'pill pill-'+toneFor(value)}><i className="pill-dot"/>{value}</span>}
export function PageHeader({eyebrow,title,subtitle,actions}:{eyebrow?:string;title:string;subtitle?:string;actions?:ReactNode}){return <div className="page-header"><div><div className="eyebrow">{eyebrow||'DEPOFIBRA · WORKSPACE'}</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div className="header-actions">{actions}</div>}</div>}
export function Panel({title,extra,children,className=''}:{title?:string;extra?:ReactNode;children:ReactNode;className?:string}){return <section className={'panel '+className}>{title&&<div className="panel-head"><h3>{title}</h3>{extra}</div>}{children}</section>}
export function Button({children,onClick,variant='primary',type='button',disabled=false,className=''}:{children:ReactNode;onClick?:()=>void;variant?:'primary'|'outline'|'ghost'|'subtle'|'danger';type?:'button'|'submit';disabled?:boolean;className?:string}){return <button className={'btn btn-'+variant+' '+className} type={type} onClick={onClick} disabled={disabled}>{children}</button>}
export function Modal({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){return <div className="modal-scrim" onMouseDown={onClose} role="presentation"><section className="modal" onMouseDown={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button aria-label="Cerrar" className="icon-button" onClick={onClose}><X size={19}/></button></div><div className="modal-content">{children}</div></section></div>}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="form-field"><span className="field-label">{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function Empty({title,body}:{title:string;body:string}){return <div className="empty-state"><Inbox size={27}/><strong>{title}</strong><p>{body}</p></div>}
export function Initials({name}:{name:string}){return <span className="initials">{name.replace(/·.*/,'').trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase()}</span>}
export function Info({label,value}:{label:string;value:string|number}){return <div className="info-item"><span>{label}</span><strong>{value}</strong></div>}
export function Back({to,label}:{to:string;label:string}){return <Link className="back-link" to={to}><ArrowLeft size={17}/>{label}</Link>}
export function ActionLink({to,children}:{to:string;children:ReactNode}){return <Link className="link-action" to={to}>{children}<ArrowRight size={14}/></Link>}
export function Timeline({items}:{items:{at:string;text:string;by:string}[]}){return <div className="timeline">{items.length?items.map((x,i)=><div className="timeline-event" key={i}><i/><div><strong>{x.text}</strong><span>{x.by} · {dateText(x.at)}</span></div></div>):<p className="muted">No hay actividad registrada.</p>}</div>}
export function DataBar({label,value,max,color='blue'}:{label:string;value:number;max:number;color?:'blue'|'teal'|'amber'}){return <div className="data-bar"><div className="data-bar-title"><span>{label}</span><strong>{value}</strong></div><div className="track"><span className={'fill fill-'+color} style={{width:(max?Math.max(5,value/max*100):0)+'%'}}/></div></div>}
export function CopyButton({text}:{text:string}){const [copied,setCopied]=useState(false);const copy=async()=>{try{await navigator.clipboard.writeText(text)}catch{const field=document.createElement('textarea');field.value=text;document.body.append(field);field.select();document.execCommand('copy');field.remove()}setCopied(true);window.setTimeout(()=>setCopied(false),2300)};return <Button onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar mensaje'}</Button>}
export function NoteDemo(){return <span className="soft-note"><ShieldCheck size={14}/> Solo datos ficticios, sin backend ni autenticación real</span>}
