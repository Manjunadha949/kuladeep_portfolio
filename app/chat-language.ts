// Requests for translation or an Indian-language reply must reach the AI provider.
const languageNames=/\b(?:hindi|telugu|tamil|kannada|malayalam|marathi|bengali|bangla|gujarati|punjabi|odia|oriya|assamese|urdu|sanskrit|konkani|manipuri|meitei|nepali|sindhi|kashmiri|dogri|maithili|bodo|santali|santhali|english)\b/i;
const nativeNames=/(?:हिन्दी|हिंदी|తెలుగు|தமிழ்|ಕನ್ನಡ|മലയാളം|मराठी|বাংলা|ગુજરાતી|ਪੰਜਾਬੀ|ଓଡ଼ିଆ|অসমীয়া|اردو|संस्कृत|कोंकणी|नेपाली|سنڌي|मैथिली|डोगरी|کٲشُر|ꯃꯤꯇꯩ|ᱥᱟᱱᱛᱟᱲᱤ)/u;
const indianScripts=/[\u0900-\u0DFF\u0600-\u06FF\u1C50-\u1C7F\uABC0-\uABFF]/u;
export function needsLanguageReply(messages:{role:string,content:string}[]){
  const text=messages.at(-1)?.content||'';
  if(/\btranslat(?:e|ion|ing)\b/i.test(text)||indianScripts.test(text)||nativeNames.test(text))return true;
  if(languageNames.test(text)&&(/\b(in|into|answer|reply|speak|explain|language|please|lo|mein)\b/i.test(text)||text.trim().split(/\s+/).length<=2))return true;
  // Keep a previously requested language until the visitor asks for another one.
  return messages.some(m=>m.role==='user'&&(nativeNames.test(m.content)||(languageNames.test(m.content)&&/\b(in|into|answer|reply|speak|explain|language|please|lo|mein)\b/i.test(m.content))));
}
