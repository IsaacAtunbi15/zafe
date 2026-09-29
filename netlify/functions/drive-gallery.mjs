const FOLDER_ID=process.env.ZAFE_DRIVE_FOLDER_ID||'1sRKOAu3Y7IJxo1tbEbItSDjAZ6DFAJKV';

export default async()=>{
  const apiKey=process.env.GOOGLE_DRIVE_API_KEY;
  if(!apiKey)return new Response(JSON.stringify({error:'Drive API key not configured'}),{status:503,headers:{'content-type':'application/json'}});
  try{
    const files=[];
    let pageToken='';
    do{
      const query=new URLSearchParams({
        key:apiKey,
        q:`'${FOLDER_ID}' in parents and trashed = false`,
        fields:'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size,md5Checksum)',
        pageSize:'1000',
        orderBy:'name_natural'
      });
      if(pageToken)query.set('pageToken',pageToken);
      const response=await fetch(`https://www.googleapis.com/drive/v3/files?${query}`);
      if(!response.ok)throw new Error(`Drive API returned ${response.status}`);
      const data=await response.json();
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
    return new Response(JSON.stringify({files:deduplicated,count:deduplicated.length,duplicatesRemoved:files.length-deduplicated.length,source:'google-drive'}),{headers:{'content-type':'application/json','cache-control':'public, max-age=300, s-maxage=900'}});
  }catch(error){
    return new Response(JSON.stringify({error:error.message}),{status:502,headers:{'content-type':'application/json'}});
  }
};
