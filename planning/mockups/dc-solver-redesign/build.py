import base64
R='/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/'
h=open('head.css.html').read()
for k,f in (('F400','satoshi-400'),('F700','satoshi-700'),('F900','satoshi-900')):
    h=h.replace('__'+k+'__',base64.b64encode(open(R+'public/fonts/'+f+'.woff2','rb').read()).decode())
logo=base64.b64encode(open(R+'public/icons/icon-192.png','rb').read()).decode()
b=open('body.html').read().replace('__LOGO__',logo).replace('__DATA__',open('data.json').read())
out=h+b+'<script>\n'+open('app.js').read()+'\n</script>\n</body>\n</html>\n'
open(R+'planning/mockups/dc-solver-redesign/solver-a.html','w').write(out);print(len(out))
