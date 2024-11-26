## NAUTH

NAUTH is a Node.js authentication and permission management framework. It is designed to be simple to use and easy to integrate into any Node.js application.

> Node.js 认证与权限管理框架

### Quick to use

```shell
npm install @i-xor/nauth

pnpm install @i-xor/nauth

yarn add @i-xor/nauth
```

```ts
import { NauthManager } from './manager';

NauthManager.setConfiguration(null!);
NauthManager.setDB(dbAdapter);

// Check nauth whether it's ready.
NauthManager.check()
```

```ts
Verifier.login(uid);
```

### Login

```ts
const _token = await checkPass(username, password) ? await Verifier.login(username) : null;

const id = await Verifier.loginID(_token);

const token = await Verifier.tokenValue(id);

const user = await Verifier.info(id);

const ctx = await Verifier.ctx(id);

const isLogin = await Verifier.isLogin(id);

await Verifier.logout(id);
```

### Router
    
```ts
RouterMatcher.isMatched('/user/1', '/user/{*path}') ? Verifier.checkLogin(id) : null;

const router = new RouterMatcher();
router.add('/user/:id', async () => {
    const id = ctx.params.id;
    await Verifier.checkLogin(id);
});
router.add('/admin/:id', async () => {
    const id = ctx.params.id;
    await Verifier.checkPermission(id, 'user');
});
router.match('/user/1');
```

### Manager

```ts
const configuration = NauthManager.configuration;

const db = NauthManager.dbAdapter;

const verifierLogic = NauthManager.getLogic(logicType);
```