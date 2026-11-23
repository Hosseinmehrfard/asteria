import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVideo} from '../video.js';
const cases=[
 ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','youtube','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'],
 ['https://youtu.be/dQw4w9WgXcQ','youtube','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'],
 ['https://youtube.com/shorts/dQw4w9WgXcQ','youtube','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'],
 ['https://www.aparat.com/v/abc12','aparat','https://www.aparat.com/video/video/embed/videohash/abc12/vt/frame'],
];
for(const [input,provider,embed] of cases)test(`normalizes ${provider}`,()=>assert.deepEqual([normalizeVideo(input)?.provider,normalizeVideo(input)?.embed_url],[provider,embed]));
for(const input of ['javascript:alert(1)','https://evil.example/video','http://youtu.be/dQw4w9WgXcQ','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://www.youtube.com/watch?v=bad','https://aparat.com/v/%22%3E','https://youtube.com:3000/watch?v=dQw4w9WgXcQ'])test(`rejects unsafe ${input}`,()=>assert.equal(normalizeVideo(input),null));

test('allows only generated local public video path',()=>{const good='/uploads/'+'a'.repeat(40)+'.mp4';assert.equal(normalizeVideo(good)?.provider,'file');assert.equal(normalizeVideo('/uploads/private.mp4'),null);});
