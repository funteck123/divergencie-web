import json,base64,io,re
from PIL import Image
def shrink(uri,maxw=1000):
    b=base64.b64decode(uri.split(',',1)[1]); im=Image.open(io.BytesIO(b)).convert('RGB')
    if im.width>maxw: im=im.resize((maxw,round(im.height*maxw/im.width)),Image.LANCZOS)
    o=io.BytesIO(); im.save(o,'WEBP',quality=82,method=6)
    return 'data:image/webp;base64,'+base64.b64encode(o.getvalue()).decode()
lib=json.load(open('lib.json')); Y=json.load(open('ylib.json'))
out={'lib':{}, 'papers':{}}
# structure
for b in lib:
    out['lib'][b]={}
    for s,comps in lib[b].items():
        out['lib'][b][s]={}
        for c,items in comps.items():
            top=[re.sub(r'^CAIE (IGCSE|A Level|A Levels?) '+re.escape(s)+r'\s*','',i['title']) for i in items]
            yr=[[y['year'],y['session'],y['variant'],y['paperId']] for y in (Y.get(b,{}).get(s,{}).get(c,[])) if 'year' in y]
            out['lib'][b][s][c]={'top':top,'yr':yr}
# content
m=json.load(open('mcq_motion.json'))
out['papers']['top:Physics:Ch1.2 Motion (MCQ) Worksheet 1']={'kind':'mcq','title':'Ch1.2 Motion (MCQ) Worksheet 1','q':[{'n':q['questionNumber'],'img':shrink(q['image']),'ans':q['correctAnswer']} for q in m['questions']]}
for pid in ['0625_s26_42','0625_m26_62']:
    d=json.load(open(f'p264/{pid}.json'))
    ans={a['questionNumber']:a for a in d['answers']}
    qs=[]
    for q in d['questions']:
        a=ans.get(q['questionNumber'])
        qs.append({'n':q['questionNumber'],'img':shrink(q['image']),'marks':int(q['marks']) if str(q['marks']).isdigit() else 0,'ms':shrink(a['image']) if a and a.get('image') and str(a.get('corrupted'))!='True' else None,'text':q['text'][:400]})
    out['papers'][pid]={'kind':'theory' if '_4' in pid else 'practical','qs':qs}
out['grades']={'0625_s26_42:4':json.load(open('mk/grade_q4.json')),'0625_m26_62:4':json.load(open('mk/grade_p6q4.json'))}
json.dump(out,open('mk/data.json','w'),separators=(',',':'))
import os;print(os.path.getsize('mk/data.json'))
print({k:(len(v['q']) if v['kind']=='mcq' else len(v['qs'])) for k,v in out['papers'].items()})
