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
import { NauthConfiguration } from './configuration';

NauthManager.setConfiguration(new NauthConfiguration());
NauthManager.setDB(adapter);

// Check nauth whether it's ready.
NauthManager.check()
```

```ts
Verifier.login(uid);
```

### Configuration

> You can directly create configuration objects, and they have default values.

```ts
const configuration = new NauthConfiguration();

// Please refer to it for details.
export class NauthConfiguration {
  constructor(config?: Partial<NauthConfiguration>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  /**
   * Token 名称
   */
  public readonly tokenName: string = 'token';

  /**
   * Token 有效时长 (单位s)
   */
  public readonly tokenTimeout = 3 * 24 * 60 * 60;

  /**
   * Token 样式 (UUID | SIMPLE_UUID | NANO_ID | RANDOM_STR)
   */
  public readonly tokenStyle:
    | 'UUID'
    | 'SIMPLE_UUID'
    | 'NANO_ID'
    | 'RANDOM_STR' = 'UUID';

  /**
   * Token 前缀
   */
  public readonly tokenPrefix: string = 'Bearer ';

  /**
   * Token 续签时长 (单位s)，在过期时间内续签
   */
  public readonly tokenRenew = 24 * 60 * 60;

  /**
   * Token 续签条件 (单位s)，在距离过期时间小于该值时触发续签
   */
  public readonly tokenRenewCondition = 12 * 60 * 60;
}
```

> There are a few properties that you can set.

```ts
const configuration = new NauthConfiguration({
  tokenName: 'token',
  tokenTimeout: 3 * 24 * 60 * 60,
})
```

### Test

```shell
npm run test
npm run test:coverage

pnpm run test 
pnpm run test:coverage

yarn test
yarn test:coverage
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
### Multiple types of users

#### Create a new class and extend the Verifier class
```ts
// Create a new file: user-verifier.ts

import { Verifier, VerifierLogic } from '@i-xor/nauth';

export class UserVerifier extends Verifier {
  static readonly TYPE: string = 'user';

  static _logic: VerifierLogic;

  static set logic(value: VerifierLogic) {
    this._logic = value;
  }

  static get logic() {
    if (!this._logic) {
      this._logic = new VerifierLogic(this.TYPE);
    }
    return this._logic;
  }

  static init() {
    this.logic = new VerifierLogic(this.TYPE);
  }
}

// Create a new file: admin-verifier.ts
export class AdminVerifier extends Verifier {
  static readonly TYPE: string = 'admin';

  static _logic: VerifierLogic;

  static set logic(value: VerifierLogic) {
    this._logic = value;
  }

  static get logic() {
    if (!this._logic) {
      this._logic = new VerifierLogic(this.TYPE);
    }
    return this._logic;
  }

  static init() {
    this.logic = new VerifierLogic(this.TYPE);
  }
}
```

#### Use the new class in the application

```ts
import { UserVerifier } from './user-verifier';
import { AdminVerifier } from './admin-verifier';

UserVerifier.login(uid);
AdminVerifier.login(uid);
```

> There are no changes to the way it is used.

### Long-term validity

> If you want a user's 'token' to be valid for a long time (never expire), you can use this method.

```ts
Verifier.login(uid);

Verifier.setLongTermValid(uid)
```

> You can cancel the long-term validity and restore the expiration time.

```ts
Verifier.removeLongTermValid(uid)
```

### Customize storage policies

You need to ensure that the atomicity of the method is mutually exclusive with the consistency in the case of concurrency, otherwise problems may occur !

> Create a new class and extend the DBAdapter class.

```ts
// Create a new file: mysql-adapter.ts
export class MySQLAdapter extends DBAdapter {
  // Implement the methods in the DBAdapter class
}
```

> Use the new class in the application

```ts
import { MySQLAdapter } from './mysql-adapter';

NauthManager.setDB(new MySQLAdapter());
```

> You can also choose to set up a separate authenticator.

```ts
import { MySQLAdapter } from './mysql-adapter';

Verifier.setDB(mySQLAdapter);
```

### Error codes

> You can find out the cause of the error by judging the error code.

> For more error codes, please refer to the definition of the corresponding enumeration class.

#### Not login

```ts
import { NotLoginException } from './not-login.exception';
import { AUTH_CODE } from './auth-code.constant';

try {
  await Verifier.checkLogin(id);
} catch (error: NotLoginException | MutexException) {
  if (error instanceof NotLoginException) {
    switch (error.code) {
      case AUTH_CODE.NOT_LOGIN:
        // Do something
        break;
      case AUTH_CODE.LOGIN_EXPIRED:
        // Do something
        break;
      default:
        break;
    }
  }
}
```

#### Mutex lock

> If you don't want to see this error, please do a good job at the API gateway level: the same user cannot log in, log out, or modify status/information at the same time!
> 
> 出现MutexException是正常的现象，因为用户的登录和退出以及修改都应当是互斥的，如果你不想见到这个错误，请在API网关层面做好约束：同一个用户不能同时登录、退出登录、修改状态/信息！

```ts
import { NotLoginException } from './not-login.exception';
import { AUTH_CODE } from './auth-code.constant';
import { MUTEX_CODE } from './mutex-code.constant';

try {
  await Verifier.checkLogin(id);
} catch (error: NotLoginException | MutexException) {
  if (error instanceof MutexException) {
    switch (error.code) {
      case MUTEX_CODE.SYSTEM_MUTEX:
        // Do something
        break;
      case MUTEX_CODE.LOCK_TIMEOUT:
        // Do something
        break;
      default:
        break;
    }
  }
}
```

### Listener

> You can listen for events and do something when they occur.

Each logic controller (`Logic` & `Verifier`) has access to a subject.

The subject is a `Subject<Event>` object from the `rxjs` library.

> The type of payload you can print after subscribing to view or consult the source code, only the `login`, `logout`, and `kick out triggers` will pass `UserDO`, and the rest may be `null` or `uid`.

```ts
import { Event, EVENT_TYPE } from '@i-xor/nauth';

Verifier.subject.subscribe(async (event: Event) => {
  switch (event.type) {
    case EVENT_TYPE.LOGOUT:
    case EVENT_TYPE.KICKOUT_FEEDBACK:
      const payload = event.payload as UserDO;
      // Do something
      break;
    case EVENT_TYPE.OFFLINE_ALL:
      // payload is null
      // Do something
      break;
  }
});
```

```ts
// You can also use logic to get subject
const logic = NauthManager.getLogic(logicType) || Verifier.logic;

logic.subject.subscribe(async (event: Event) => {
  switch (event.type) {
    case EVENT_TYPE.LOGOUT:
    case EVENT_TYPE.KICKOUT_FEEDBACK:
      const payload = event.payload as UserDO;
      // Do something
      break;
    case EVENT_TYPE.OFFLINE_ALL:
      // payload is null
      // Do something
      break;
  }
});
```