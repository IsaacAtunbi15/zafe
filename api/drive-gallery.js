const FOLDER_ID=process.env.ZAFE_DRIVE_FOLDER_ID||'1sRKOAu3Y7IJxo1tbEbItSDjAZ6DFAJKV';

export default async function handler(_request,response){
  const apiKey=process.env.GOOGLE_DRIVE_API_KEY;
  if(!apiKey)return response.status(503).json({error:'Drive API key not configured'});
  try{
    const files=[];
    let pageToken='';
    do{
      const query=new URLSearchParams({key:apiKey,q:`'${FOLDER_ID}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size,md5Checksum)',pageSize:'1000',orderBy:'name_natural'});
      if(pageToken)query.set('pageToken',pageToken);
      const driveResponse=await fetch(`https://www.googleapis.com/drive/v3/files?${query}`);
      if(!driveResponse.ok)throw new Error(`Drive API returned ${driveResponse.status}`);
      const data=await driveResponse.json();
      files.push(...(data.files||[]).filter(file=>file.mimeType?.startsWith('image/')).map(file=>({id:file.id,title:file.name,type:file.mimeType,createdTime:file.createdTime,modifiedTime:file.modifiedTime,size:file.size,checksum:file.md5Checksum})));
      pageToken=data.nextPageToken||'';
    }while(pageToken);
    const canonical=name=>name.replace(/^Copy of /i,'').replace(/-1(?=\.[^.]+$)/,'').trim().toLowerCase();
    const unique=new Map();
    const checksums=new Set();
    for(const file of files){
      if(file.checksum&&checksums.has(file.checksum))continue;
      if(file.checksum)checksums.add(file.checksum);
      const key=canonical(file.title);
      const existing=unique.get(key);
      if(!existing||(/^Copy of /i.test(existing.title)&&!/^Copy of /i.test(file.title)))unique.set(key,file);
    }
    const deduplicated=[...unique.values()];
    response.setHeader('Cache-Control','public, max-age=300, s-maxage=900');
    return response.status(200).json({files:deduplicated,count:deduplicated.length,duplicatesRemoved:files.length-deduplicated.length,source:'google-drive'});
  }catch(error){
    return response.status(502).json({error:error.message});
  }
}
