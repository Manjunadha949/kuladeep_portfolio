export function normaliseWhatsApp(value:string){const digits=value.replace(/[^0-9]/g,'');return digits.length===10?'91'+digits:digits;}
