import type {ProductCategory} from '../domain';

/** Internal CRM request answers only; does not control the public website form. */
export default function OpportunityAttributeFields({category,values,onChange}:{
 category?:ProductCategory;values:Record<string,string>;onChange:(attributeId:string,value:string)=>void
}){
 const questions=(category?.attributes||[]).filter(a=>a.responseType&&!a.hidden);
 if(!category||!questions.length)return null;
 return <fieldset className="crm-attribute-answers">
  <legend>Atributos de {category.name}</legend>
  <p>Opcionales. Registra lo que haya indicado el comprador; no deduzcas características técnicas.</p>
  {questions.map(a=>{
    const value=values[a.id]||'';
    const options=a.options||[];
    return <div className="crm-attribute-field" key={a.id}>
      <span className="crm-attribute-label">{a.label}</span>
      {a.responseType==='single'&&<>
        <select aria-label={a.label} value={options.includes(value)?value:value.startsWith('Otro:')?'__other__':''}
         onChange={e=>onChange(a.id,e.target.value==='__other__'?'Otro: ':e.target.value)}>
          <option value="">Seleccionar</option>
          {options.map(o=><option value={o} key={o}>{o}</option>)}
          <option value="__other__">Otro / a medida</option>
        </select>
        {value.startsWith('Otro:')&&<input type="text" aria-label={'Especificar '+a.label}
         placeholder="Indica la opción personalizada" value={value.slice(6)}
         onChange={e=>onChange(a.id,'Otro: '+e.target.value)}/>}
      </>}
      {a.responseType==='multiple'&&<div className="crm-attribute-choices">
        {[...options,'Otro / a medida'].map(option=>{
          const selected=value.split('; ').includes(option)||option==='Otro / a medida'&&value.split('; ').some(v=>v.startsWith('Otro:'));
          const own=option==='Otro / a medida';
          return <label key={option}><input type="checkbox" checked={selected}
           onChange={e=>{
            const current=value.split('; ').filter(Boolean);
            const remaining=own?current.filter(x=>!x.startsWith('Otro:')):current.filter(x=>x!==option);
            onChange(a.id,([...remaining,...(e.target.checked?[own?'Otro: ':option]:[])]).join('; '));
           }}/><span>{option}</span></label>;
        })}
        {value.split('; ').some(v=>v.startsWith('Otro:'))&&<input type="text" aria-label={'Otra opción para '+a.label}
         value={value.split('; ').find(v=>v.startsWith('Otro:'))?.slice(6)||''}
         onChange={e=>onChange(a.id,value.split('; ').map(x=>x.startsWith('Otro:')?'Otro: '+e.target.value:x).join('; '))}
         placeholder="Indica la opción personalizada"/>}
      </div>}
      {a.responseType==='boolean'&&<select aria-label={a.label} value={value} onChange={e=>onChange(a.id,e.target.value)}>
        <option value="">Sin respuesta</option><option value="Sí">Sí</option><option value="No">No</option>
       </select>}
      {a.responseType==='centimetres'&&<input type="number" min="0" step=".01" aria-label={a.label+' en centímetros'}
        placeholder="Medida en cm" value={value} onChange={e=>onChange(a.id,e.target.value)}/>}
      {a.responseType==='text'&&<textarea rows={2} aria-label={a.label} value={value}
        onChange={e=>onChange(a.id,e.target.value)} placeholder="Respuesta del comprador"/>}
    </div>;
  })}
 </fieldset>;
}
