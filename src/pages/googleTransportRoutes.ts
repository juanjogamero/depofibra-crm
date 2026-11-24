/**
 * Google Maps Routes Library in the operator's browser.
 * Requires the user's HTTP-referrer restricted browser key, Maps JS + Routes APIs,
 * and a billing-enabled Google Cloud project. Never hard-code a shared key.
 */
type RouteLibrary={
 Route:{computeRoutes:(q:{
  origin:string;destination:string;travelMode:'DRIVING';
  routingPreference:'TRAFFIC_UNAWARE';region:string;language:string;fields:string[];
 })=>Promise<{routes:Array<{distanceMeters?:number;durationMillis?:number}>}>}
};
type GoogleBrowser=Window&{google?:{maps?:{importLibrary:(name:string)=>Promise<RouteLibrary>}}};
const ORIGIN='Casariche, Sevilla, España';
export {ORIGIN};
let activeKey:string|null=null;
let loading:Promise<RouteLibrary>|null=null;
export async function calculateGoogleRoute(key:string,destination:string){
 const maps=(window as GoogleBrowser).google?.maps?.importLibrary;
 if(activeKey&&activeKey!==key){
  throw new Error('La biblioteca de Google Maps ya se cargó con otra clave. Recarga la pestaña antes de utilizar la nueva.');
 }
 if(!loading){
  activeKey=key;
  loading=maps?maps('routes'):new Promise<RouteLibrary>((resolve,reject)=>{
   const script=document.createElement('script');
   let settled=false;
   const fail=(reason:string)=>{
    if(settled)return;
    settled=true;window.clearTimeout(timeout);loading=null;activeKey=null;
    script.remove();reject(new Error(reason));
   };
   const timeout=window.setTimeout(()=>fail('Tiempo de espera agotado al conectar con Google Maps.'),20000);
   script.async=true;
   script.referrerPolicy='strict-origin-when-cross-origin';
   script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&loading=async';
   script.onload=()=>{
    const importLibrary=(window as GoogleBrowser).google?.maps?.importLibrary;
    if(!importLibrary){fail('No se ha podido cargar Google Maps.');return;}
    importLibrary('routes').then(lib=>{
     if(settled)return;
     settled=true;window.clearTimeout(timeout);resolve(lib);
    }).catch(()=>fail('La biblioteca de rutas no está disponible para esta clave.'));
   };
   script.onerror=()=>fail('Google Maps no se ha podido cargar. Comprueba conexión y permisos de la clave.');
   document.head.appendChild(script);
  });
 }
 const lib=await loading;
 const data=await lib.Route.computeRoutes({
  origin:ORIGIN,destination,travelMode:'DRIVING',
  routingPreference:'TRAFFIC_UNAWARE',region:'es',language:'es',
  fields:['distanceMeters','durationMillis']
 });
 const first=data.routes?.[0];
 if(!first||typeof first.distanceMeters!=='number'||!Number.isFinite(first.distanceMeters)||first.distanceMeters<=0){
  throw new Error('No se ha localizado una ruta por carretera. Comprueba el municipio y la provincia.');
 }
 return {km:Math.round(first.distanceMeters/100)/10,
  minutes:typeof first.durationMillis==='number'?Math.round(first.durationMillis/60000):null};
}
export function googleRouteUrl(destination:string){
 const params=new URLSearchParams({api:'1',origin:ORIGIN,destination,travelmode:'driving'});
 return 'https://www.google.com/maps/dir/?'+params.toString();
}
