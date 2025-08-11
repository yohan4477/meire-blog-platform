const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function checkDB() {
  const db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  
  console.log('실제 데이터베이스 구조:');
  const info = await db.all('PRAGMA table_info(blog_posts)');
  info.forEach(col => {
    console.log(`  ${col.name} (${col.type})`);
  });
  
  console.log('\n실제 데이터 확인:');
  const posts = await db.all('SELECT * FROM blog_posts LIMIT 1');
  if (posts.length > 0) {
    console.log('실제 컬럼들:', Object.keys(posts[0]));
    console.log('샘플 포스트 제목:', posts[0].title);
    console.log('샘플 포스트 ID:', posts[0].id);
    if (posts[0].log_no) console.log('log_no:', posts[0].log_no);
    if (posts[0].category) console.log('category:', posts[0].category);
  }
  
  await db.close();
}

checkDB().catch(console.error);