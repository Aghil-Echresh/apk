import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY),$=id=>document.getElementById(id);
let cats=[],products=[],cart=JSON.parse(localStorage.getItem('komeil-cart')||'[]'),cat=null,user=null,admin=false,signup=false,store={};
const money=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function show(id){$(id).showModal()} function hide(id){$(id).close()}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>hide(b.dataset.close));
function saveCart(){localStorage.setItem('komeil-cart',JSON.stringify(cart));renderCart()}
function renderCart(){
 $('count').textContent=cart.reduce((a,x)=>a+x.qty,0);
 $('cartItems').innerHTML=cart.length?cart.map((x,i)=>'<div class="order"><b>'+esc(x.name)+'</b><br>'+money(x.price)+' تومان × '+x.qty+' <button data-minus="'+i+'">−</button><button data-plus="'+i+'">+</button></div>').join(''):'<p>سبد خرید خالی است.</p>';
 $('total').textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0))+' تومان';
 document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>qty(+b.dataset.minus,-1));
 document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>qty(+b.dataset.plus,1));
}
function qty(i,d){cart[i].qty+=d;if(cart[i].qty<=0)cart.splice(i,1);saveCart()}
async function loadStore(){
 const r=await db.from('store_settings').select('*').eq('id',true).single();if(r.error)return;
 store=r.data;$('name').textContent=store.store_name;$('meta').textContent=store.address+' • '+store.phone;$('map').href=store.location_url||'#';
}
async function loadCats(){
 const r=await db.from('categories').select('*').eq('is_active',true).order('sort_order');if(r.error)return;
 cats=r.data||[];$('cats').innerHTML='<button class="'+(!cat?'active':'')+'" data-cat="">همه</button>'+cats.map(c=>'<button class="'+(cat===c.id?'active':'')+'" data-cat="'+c.id+'">'+esc(c.name)+'</button>').join('');
 document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=async()=>{cat=b.dataset.cat||null;await loadCats();await loadProducts()});
 $('pcat').innerHTML=cats.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
}
async function loadProducts(){
 let q=db.from('products').select('*').eq('is_active',true).order('featured',{ascending:false}).order('created_at',{ascending:false});
 if(cat)q=q.eq('category_id',cat);const r=await q;if(r.error)return;
 products=r.data||[];renderProducts();
}
function renderProducts(){
 const t=$('search').value.trim().toLowerCase(),list=products.filter(p=>!t||p.name.toLowerCase().includes(t)||(p.description||'').toLowerCase().includes(t));
 $('products').innerHTML=list.map(p=>'<article class="card">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'">':'<div class="ph">🛒</div>')+'<div class="body"><small>'+esc(p.unit||'عدد')+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'')+'</p><b>'+money(p.price)+' تومان</b><div class="actions"><span>موجودی '+money(p.stock_qty)+'</span><button class="add" data-add="'+p.id+'" '+(Number(p.stock_qty)<=0?'disabled':'')+'>افزودن</button></div></div></article>').join('');
 $('empty').hidden=!!list.length;document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));
}
function add(id){const p=products.find(x=>x.id===id);if(!p)return;const x=cart.find(x=>x.id===id);if(x){if(x.qty>=p.stock_qty)return; x.qty++}else cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1,stock:Number(p.stock_qty)});saveCart()}
$('search').oninput=renderProducts;$('cart').onclick=()=>show('cartBox');renderCart();
async function authState(){
 const s=await db.auth.getSession();user=s.data.session?.user||null;admin=false;
 if(user){const r=await db.from('app_admins').select('user_id').eq('user_id',user.id).maybeSingle();admin=!!r.data}
 $('auth').textContent=user?'حساب':'ورود';$('orders').hidden=!admin;
}
db.auth.onAuthStateChange(()=>authState());
$('auth').onclick=()=>{if(user){show('adminBox')}else{signup=false;authUi();show('authBox')}};
function authUi(){$('authTitle').textContent=signup?'ثبت‌نام':'ورود';$('authForm').querySelector('.primary').textContent=signup?'ساخت حساب':'ورود';$('toggle').textContent=signup?'حساب دارم، ورود':'حساب ندارم، ثبت‌نام'}
$('toggle').onclick=()=>{signup=!signup;authUi()};
$('authForm').onsubmit=async e=>{
 e.preventDefault();$('authMsg').textContent='در حال اتصال...';const email=$('email').value.trim(),password=$('pass').value;
 const r=signup?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});
 $('authMsg').textContent=r.error?r.error.message:(signup?'ثبت‌نام انجام شد. اگر تأیید ایمیل فعال است ایمیل را بررسی کن.':'ورود انجام شد.');
 if(!r.error)setTimeout(()=>hide('authBox'),700);
};
$('orders').onclick=async()=>{show('adminBox');await loadAdmin()};
$('addProduct').onclick=()=>show('productBox');
async function loadAdmin(){
 const r=await db.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}).limit(50);
 if(r.error){$('adminList').textContent=r.error.message;return}
 $('adminList').innerHTML=(r.data||[]).map(o=>'<div class="order"><b>سفارش '+o.id.slice(0,8)+'</b><p>'+esc(o.customer_name)+' • '+esc(o.customer_phone)+'<br>'+esc(o.delivery_address)+'</p><p>'+o.order_items.map(i=>esc(i.product_name)+' × '+i.quantity).join('، ')+'</p><b>'+money(o.total)+' تومان</b><select data-status="'+o.id+'">'+['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'].map(s=>'<option '+(s===o.status?'selected':'')+' value="'+s+'">'+s+'</option>').join('')+'</select></div>').join('');
 document.querySelectorAll('[data-status]').forEach(s=>s.onchange=async()=>{await db.from('orders').update({status:s.value}).eq('id',s.dataset.status)});
}
$('productForm').onsubmit=async e=>{
 e.preventDefault();const n=$('pname').value.trim(),r=await db.from('products').insert({name:n,slug:n.replace(/\s+/g,'-')+'-'+Date.now(),price:Number($('pprice').value),stock_qty:Number($('pstock').value),category_id:$('pcat').value,image_url:$('pimg').value.trim()||null,description:$('pdesc').value.trim()||null,is_active:true});
 $('pmsg').textContent=r.error?r.error.message:'محصول ذخیره شد.';if(!r.error){await loadProducts();setTimeout(()=>hide('productBox'),500)}
};
$('checkout').onclick=async()=>{
 if(!cart.length)return;if(!user){hide('cartBox');signup=false;authUi();show('authBox');return}
 const name=prompt('نام گیرنده:'),phone=prompt('شماره تماس:'),address=prompt('آدرس تحویل:');if(!name||!phone||!address)return;
 const sub=cart.reduce((a,x)=>a+x.price*x.qty,0),r=await db.from('orders').insert({user_id:user.id,customer_name:name,customer_phone:phone,delivery_address:address,subtotal:sub,delivery_fee:Number(store.delivery_fee||0),total:sub+Number(store.delivery_fee||0)}).select().single();
 if(r.error)return alert(r.error.message);
 const ir=await db.from('order_items').insert(cart.map(x=>({order_id:r.data.id,product_id:x.id,product_name:x.name,unit_price:x.price,quantity:x.qty})));
 if(ir.error)return alert(ir.error.message);cart=[];saveCart();hide('cartBox');alert('سفارش با موفقیت ثبت شد');
};
$('signOut')?.addEventListener('click',async()=>db.auth.signOut());
loadStore();loadCats();loadProducts();authState();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
