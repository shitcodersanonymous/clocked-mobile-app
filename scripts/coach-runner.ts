/**
 * Coach Engine test runner — outputs JSON results to stdout
 * Run via: npx tsx scripts/coach-runner.ts
 */
import { generateCoachRecommendation, recommendationToPrompt } from '../lib/coachEngine';

let PASS = 0, FAIL = 0;
const RESULTS: any[] = [];

function chk(testId: string, id: string, ok: boolean, expected: any, actual: any) {
  if (ok) PASS++;
  else FAIL++;
  return ok;
}


console.log('Running Part 2: Coach Engine tests...');


function mkHistory(n, difficulty, daysAgo=1) {
  return Array.from({length:n},(_,i)=>({
    id:`w${i}`, workout_name:'Heavy Bag Blast',
    completed_at: new Date(Date.now()-(i+daysAgo)*86400000).toISOString(),
    duration:1800, xp_earned:100, difficulty, notes:null,
    round_feedback:null, is_manual_entry:false,
  }));
}

function mkProfile(overrides={}) {
  return {
    prestige:null, current_level:1, current_streak:3, longest_streak:10,
    workouts_completed:10, total_training_seconds:36000, experience_level:'intermediate',
    equipment:{ gloves:true, wraps:true, heavyBag:true, speedBag:false, doubleEndBag:false, jumpRope:true, treadmill:false },
    goals:null, last_workout_date: new Date(Date.now()-86400000).toISOString(),
    comeback_count:0, double_days:0, morning_workouts:3, night_workouts:1,
    weekend_workouts:2, weekday_workouts:8,
    punch_1_count:500, punch_2_count:400, punch_3_count:100, punch_4_count:80,
    punch_5_count:50, punch_6_count:30, punch_7_count:0, punch_8_count:0,
    slips_count:10, rolls_count:5, pullbacks_count:0, circles_count:0,
    ...overrides,
  };
}

function coach(id, histFn, profFn, checkFn) {
  const history = histFn(); const profile = profFn();
  const rec = generateCoachRecommendation(history, profile);
  const checks = [];
  const l = (cid,ok,exp,act) => { checks.push({cid,ok,exp:String(exp),act:String(act??'')}); chk(id,cid,ok,exp,act); };
  checkFn(rec, l);
  RESULTS.push({id, checks, r:rec});
}

// Q1.1 Too easy → bump up
coach('Q1.1',
  ()=>[...mkHistory(7,'too_easy'),...mkHistory(3,'just_right')],
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{
    l('Q1', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q2', rec.suggestedRestDuration<60, 'rest<60', rec.suggestedRestDuration);
  }
);

// Q1.2 Too hard → bump down
coach('Q1.2',
  ()=>[...mkHistory(7,'too_hard'),...mkHistory(3,'just_right')],
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{
    l('Q3', rec.suggestedDifficulty==='beginner', 'beginner', rec.suggestedDifficulty);
    l('Q4', rec.suggestedRestDuration>60, 'rest>60', rec.suggestedRestDuration);
  }
);

// Q1.3 All just_right → maintain
coach('Q1.3',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{ l('Q5', rec.suggestedDifficulty==='intermediate', 'intermediate', rec.suggestedDifficulty); }
);

// Q1.4 No difficulty data
coach('Q1.4',
  ()=>mkHistory(10,null),
  ()=>mkProfile({experience_level:'advanced'}),
  (rec,l)=>{
    l('Q6', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q7', rec.confidence==='low'||rec.confidence==='medium', 'low/medium', rec.confidence);
  }
);

// Q1.5 Already at max, still too easy
coach('Q1.5',
  ()=>[...mkHistory(8,'too_easy'),...mkHistory(2,'just_right')],
  ()=>mkProfile({experience_level:'advanced'}),
  (rec,l)=>{
    l('Q8', rec.suggestedDifficulty==='advanced', 'advanced', rec.suggestedDifficulty);
    l('Q9', rec.suggestedRounds>4, 'suggestedRounds increased', rec.suggestedRounds);
  }
);

// R1.1 Getting easier trend
coach('R1.1',
  ()=>[...mkHistory(5,'too_easy',1),...mkHistory(5,'too_hard',6)].sort((a,b)=>a.completed_at.localeCompare(b.completed_at)),
  ()=>mkProfile({experience_level:'intermediate'}),
  (rec,l)=>{ l('R1', rec.suggestedDifficulty==='advanced'||rec.suggestedDifficulty==='intermediate', 'bumped or maintained', rec.suggestedDifficulty); }
);

// R1.4 Insufficient data
coach('R1.4',
  ()=>mkHistory(2,'just_right'),
  ()=>mkProfile(),
  (rec,l)=>{
    l('R6', true, 'no crash', 'ok');
    l('R7', rec.confidence==='low'||rec.confidence==='medium', 'low/medium', rec.confidence);
  }
);

// S1.2 Strong throughout
coach('S1.2',
  ()=>mkHistory(5,'just_right').map(w=>({...w, round_feedback:{1:5,2:5,3:5,4:5,5:5}})),
  ()=>mkProfile(),
  (rec,l)=>{ l('S3', rec.suggestedRounds>=4, 'rounds>=4', rec.suggestedRounds); }
);

// T1.1 Jab-cross dominant
coach('T1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({punch_1_count:5000,punch_2_count:4000,punch_3_count:200,punch_4_count:100,punch_5_count:0,punch_6_count:0,experience_level:'intermediate'}),
  (rec,l)=>{
    l('T1', rec.punchEmphasis?.includes(5)||rec.punchEmphasis?.includes(6), 'emphasis 5 or 6', String(rec.punchEmphasis));
    l('T2', rec.focusAreas?.includes('variety'), 'variety focus', String(rec.focusAreas));
  }
);

// T1.2 Balanced distribution
coach('T1.2',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({punch_1_count:500,punch_2_count:500,punch_3_count:500,punch_4_count:500,punch_5_count:500,punch_6_count:500}),
  (rec,l)=>{ l('T3', (rec.punchEmphasis?.length||0)<=1, '<=1 emphasis', rec.punchEmphasis?.length); }
);

// U1.1 Zero defense after 15 workouts
coach('U1.1',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({slips_count:0,rolls_count:0,pullbacks_count:0,circles_count:0,workouts_completed:15,experience_level:'intermediate'}),
  (rec,l)=>{
    l('U1', rec.focusAreas?.includes('defense'), 'defense in focusAreas', String(rec.focusAreas));
    l('U2', rec.includeDefenseInCombos===true, 'includeDefenseInCombos=true', rec.includeDefenseInCombos);
    l('U3', (rec.defenseEmphasis?.length||0)>0, 'defenseEmphasis>0', rec.defenseEmphasis?.length);
  }
);

// U1.2 Beginner no defense push
coach('U1.2',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({slips_count:0,rolls_count:0,experience_level:'beginner',workouts_completed:15}),
  (rec,l)=>{
    l('U4', !rec.focusAreas?.includes('defense'), 'no defense for beginner', String(rec.focusAreas));
    l('U5', rec.includeDefenseInCombos!==true, 'includeDefenseInCombos=false', rec.includeDefenseInCombos);
  }
);

// V1.1 Same day double session
coach('V1.1',
  ()=>mkHistory(5,'just_right',0),
  ()=>mkProfile({last_workout_date:new Date().toISOString()}),
  (rec,l)=>{
    l('V1', rec.workoutType==='shadowboxing'||rec.focusAreas?.includes('recovery'), 'shadowboxing or recovery', `${rec.workoutType}/${rec.focusAreas}`);
    l('V2', rec.focusAreas?.includes('recovery'), 'recovery in focusAreas', String(rec.focusAreas));
    l('V3', rec.suggestedDifficulty==='beginner'||rec.suggestedDifficulty==='intermediate', 'bumped down', rec.suggestedDifficulty);
  }
);

// V1.2 7+ day gap
coach('V1.2',
  ()=>mkHistory(5,'just_right',10),
  ()=>mkProfile({last_workout_date:new Date(Date.now()-10*86400000).toISOString(),comeback_count:2}),
  (rec,l)=>{ l('V4', rec.includeWarmup===true, 'includeWarmup=true', rec.includeWarmup); }
);

// V1.3 Normal next day
coach('V1.3',
  ()=>mkHistory(5,'just_right',1),
  ()=>mkProfile({last_workout_date:new Date(Date.now()-86400000).toISOString()}),
  (rec,l)=>{ l('V7', !rec.focusAreas?.includes('recovery'), 'no recovery tag', String(rec.focusAreas)); }
);

// W1.4 Same workout 5x
coach('W1.4',
  ()=>Array.from({length:5},(_,i)=>({...mkHistory(1,'just_right')[0],id:`w${i}`,workout_name:'Heavy Bag Blast'})),
  ()=>mkProfile(),
  (rec,l)=>{ l('W7', rec.focusAreas?.includes('variety'), 'variety in focusAreas', String(rec.focusAreas)); }
);

// X1.1 Competition goal
coach('X1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile({goals:['competition'],experience_level:'advanced'}),
  (rec,l)=>{
    l('X1', rec.suggestedRoundDuration===180, 180, rec.suggestedRoundDuration);
    l('X2', rec.suggestedRestDuration<=60, '<=60', rec.suggestedRestDuration);
    l('X3', rec.focusAreas?.includes('defense'), 'defense', String(rec.focusAreas));
  }
);

// X1.2 Notes: soreness
coach('X1.2',
  ()=>mkHistory(5,'just_right').map((w,i)=>i===0?{...w,notes:'right shoulder is sore'}:w),
  ()=>mkProfile(),
  (rec,l)=>{
    l('X4', rec.workoutType==='shadowboxing', 'shadowboxing', rec.workoutType);
    l('X5', rec.suggestedDifficulty==='beginner'||rec.suggestedDifficulty==='intermediate', 'bumped down', rec.suggestedDifficulty);
  }
);

// Y1.3 Zero history
coach('Y1.3',
  ()=>[],
  ()=>mkProfile({workouts_completed:0}),
  (rec,l)=>{
    l('Y4', rec.isDefault===true, 'isDefault=true', rec.isDefault);
    l('Y5', rec.confidence==='low', 'low', rec.confidence);
    l('Y7', rec.encouragement&&rec.encouragement.length>0, 'has encouragement', rec.encouragement);
  }
);

// Y1.1 High confidence
coach('Y1.1',
  ()=>mkHistory(15,'just_right'),
  ()=>mkProfile({workouts_completed:15}),
  (rec,l)=>{
    l('Y1', rec.confidence==='high', 'high', rec.confidence);
    l('Y2', rec.dataPointsUsed===15, 15, rec.dataPointsUsed);
  }
);

// Y1.2 Low confidence
coach('Y1.2',
  ()=>mkHistory(1,null,14),
  ()=>mkProfile({workouts_completed:1,last_workout_date:new Date(Date.now()-14*86400000).toISOString()}),
  (rec,l)=>{ l('Y3', rec.confidence==='low', 'low', rec.confidence); }
);

// Z1.1 Coach → Builder prompt
coach('Z1.1',
  ()=>mkHistory(10,'just_right'),
  ()=>mkProfile(),
  (rec,l)=>{
    const prompt = recommendationToPrompt(rec);
    l('Z1', typeof prompt==='string'&&prompt.length>0, 'non-empty string', prompt.slice(0,50));
    l('Z2', /\d/.test(prompt), 'contains numbers', prompt.slice(0,80));
    l('Z5', /beginner|intermediate|advanced/i.test(prompt), 'contains difficulty', prompt.slice(0,80));
    l('Z6', /bag|shadow|boxing/i.test(prompt), 'contains workout type', prompt.slice(0,80));
  }
);



// Output JSON
process.stdout.write(JSON.stringify({ PASS, FAIL, RESULTS }) + '\n');
