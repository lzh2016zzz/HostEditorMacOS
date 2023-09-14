# Hosts文件编辑器

本项目是一个基于React和Tauri的hosts文件编辑器。通过这个应用，用户可以方便地管理和编辑他们的hosts文件。

## 主要功能

- 加载当前的hosts文件
- 编辑单个hosts条目（支持编辑、删除、上移、下移功能）
- 批量编辑hosts文件（Raw模式）
- 清除无用的空行
- 密码保护与密码记忆功能
- 备份与历史版本管理（支持查看历史版本，回退到历史版本，删除历史版本）

## 技术栈

- [React](https://reactjs.org/) - 用于构建用户界面的JavaScript库
- [Tauri](https://tauri.studio/) - 一个用于构建高性能、安全和轻量级的应用程序的框架
- [Bootstrap](https://getbootstrap.com/) - 用于创建现代、响应式和移动优先的web项目的开源工具包

## 项目设置

### 安装依赖

在项目根目录下运行以下命令来安装所有必要的依赖：

```sh
yarn
cargo install
```

### 运行项目
在项目根目录下运行以下命令来启动开发服务器：

```sh
cargo tauri dev
```

构建项目
要构建生产版本的项目，请在项目根目录下运行以下命令：

```
cargo  tauri build --target universal-apple-darwin
```
这将创建一个build目录，其中包含了你的应用的所有文件。

