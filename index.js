// index.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();

// ---------- CONFIG ----------
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/merryweather";
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "quyyeunga20@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "09012008quy";
const ADMIN_NAME = process.env.ADMIN_NAME || "Ngueyngoc Quyy";

// ---------- MONGOOSE ----------
mongoose.set('strictQuery', false);
mongoose.connect(MONGO_URL).then(()=> console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB err", err.message));

// ---------- MODELS ----------
const UserSchema = new mongoose.Schema({
  email: {type:String, unique:true},
  password: String,
  name: String,
  role: {type:String, default: "guard"} // admin / guard
});
const ShiftSchema = new mongoose.Schema({
  email: String,
  type: String,
  time: String
});
const RuleSchema = new mongoose.Schema({
  title: String,
  content: String,
  createdAt: {type:Date, default: Date.now}
});
const NoticeSchema = new mongoose.Schema({
  text: String,
  createdAt: {type:Date, default: Date.now}
});

const User = mongoose.model("User", UserSchema);
const Shift = mongoose.model("Shift", ShiftSchema);
const Rule = mongoose.model("Rule", RuleSchema);
const Notice = mongoose.model("Notice", NoticeSchema);

// ---------- MIDDLEWARE ----------
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: "merrysecret", resave: false, saveUninitialized: true }));
app.use(flash());

app.use((req,res,next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.user = req.session.user || null;
  next();
});

// ---------- UTIL: create admin if not exists ----------
async function ensureAdmin(){
  try{
    const a = await User.findOne({ email: ADMIN_EMAIL });
    if(!a){
      await User.create({ email: ADMIN_EMAIL, password: ADMIN_PASS, name: ADMIN_NAME, role: "admin" });
      console.log("Admin created:", ADMIN_EMAIL);
    } else {
      console.log("Admin exists");
    }
  }catch(e){ console.error("ensureAdmin err", e.message) }
}
ensureAdmin();

// ---------- ROUTES ----------

// home => redirect to /login or /dashboard if logged in
app.get("/", (req,res) => {
  if(req.session.user) return res.redirect("/dashboard");
  res.redirect("/login");
});

// login pages
app.get("/login", (req,res) => {
  res.render("login", { logoUrl: process.env.LOGO_URL || "/assets/logo.png", bgUrl: process.env.BG_URL || "/assets/bg.jpg", error: req.flash("error") });
});
app.post("/login", async (req,res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if(!user){
    req.flash("error", "Sai tài khoản hoặc mật khẩu");
    return res.redirect("/login");
  }
  req.session.user = { id: user._id, email: user.email, name: user.name, role: user.role };
  res.redirect("/dashboard");
});
app.get("/logout", (req,res)=> {
  req.session.destroy(() => res.redirect("/login"));
});

// dashboard & pages
app.get("/dashboard", async (req,res) => {
  if(!req.session.user) return res.redirect("/login");
  const shifts = await Shift.find().sort({ _id: -1 }).limit(200);
  const rules = await Rule.find().sort({ createdAt: -1 }).limit(50);
  const users = await User.find().sort({ name: 1 });
  const notices = await Notice.find().sort({ createdAt: -1 }).limit(5);
  res.render("dashboard", {
    user: req.session.user,
    shifts, rules, users, notices,
    logoUrl: process.env.LOGO_URL || "/assets/logo.png",
    bgUrl: process.env.BG_URL || "/assets/bg.jpg"
  });
});

// actions: onduty / offduty
app.post("/onduty", async (req,res) => {
  if(!req.session.user) return res.redirect("/login");
  const email = req.session.user.email;
  const time = new Date().toLocaleString("vi-VN");
  await Shift.create({ email, type: "OnDuty", time });
  req.flash("success", "Đã OnDuty " + time);
  res.redirect("/dashboard");
});
app.post("/offduty", async (req,res) => {
  if(!req.session.user) return res.redirect("/login");
  const email = req.session.user.email;
  const time = new Date().toLocaleString("vi-VN");
  await Shift.create({ email, type: "OffDuty", time });
  req.flash("success", "Đã OffDuty " + time);
  res.redirect("/dashboard");
});

// admin: add user
app.post("/admin/add-user", async (req,res) => {
  if(!req.session.user || req.session.user.role !== "admin") return res.redirect("/login");
  const { email, password, name, role } = req.body;
  try{
    await User.create({ email, password, name, role: role || "guard" });
    req.flash("success", "Đã tạo user");
  }catch(e){ req.flash("error", "Lỗi tạo user: " + e.message) }
  res.redirect("/dashboard");
});

// admin: add rule
app.post("/admin/add-rule", async (req,res) => {
  if(!req.session.user || req.session.user.role !== "admin") return res.redirect("/login");
  const { title, content } = req.body;
  await Rule.create({ title, content });
  req.flash("success", "Đã lưu luật lệ");
  res.redirect("/dashboard");
});

// admin: add notice
app.post("/admin/add-notice", async (req,res) => {
  if(!req.session.user || req.session.user.role !== "admin") return res.redirect("/login");
  const { text } = req.body;
  await Notice.create({ text });
  req.flash("success", "Đã gửi thông báo");
  res.redirect("/dashboard");
});

// seed route (optional) - only allow if no user in session and DB empty
app.get("/_seed", async (req,res) => {
  const n = await User.countDocuments();
  if(n > 2) return res.send("DB already has users");
  await User.create({ email: ADMIN_EMAIL, password: ADMIN_PASS, name: ADMIN_NAME, role: "admin" });
  await User.create({ email: "guard1@merryweather.com", password: "123456", name: "Bảo vệ 1", role: "guard" });
  res.send("Seeded admin and guard1");
});

app.listen(PORT, ()=> console.log("MerryWeather-Time listening on", PORT));
