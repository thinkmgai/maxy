## 설치 방법
- node.js 설치
  - linux
  ```
  sudo apt update
  sudo apt install nodejs npm
  ```
  - mac
  ```
  brew install node
  ```

- Create React App을 전역으로 컴퓨터에 설치
  ```
  npm install -g create-react-app
  ```
### 프로젝트만들기 (최신방식 - next.js 14이상 설치)
  ```
  npx create-next-app@latest
  > What is your project named?  프로젝트이름
  > Would you like to use TypeScript?  Y
  > Would you like to use ESLint?  Y
  > Would you like to use Tailwind CSS?  Y
  > Would you like to use `src/` directory?  Y
  > Would you like to use App Router?  Y
  > Would you like to customize the default import alias?  N
  ```

### 프로젝트만들기 (옛날 방식)
- create-react-app을 사용하여 새로운 React 애플리케이션을 생성
  ```
  create-react-app maxy_doc_f
  ```
- next.js 설치
  ```
  cd maxy_doc_f
  npm install --save next react react-dom
  ```


### mui 설치
- 새로운 패키지가 추가되면 
  - 1) docker 실행
  docker exec -it maxy_doc_f bash/bin
  su
  npm install ....
  - 2) DOCKERFILE에 추가 npm install ... 을 추가해준다.

  ```
  https://mui.com/material-ui/getting-started/installation/ 
  npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/lab
  npm install @mui/styled-engine-sc styled-components
  npm install @fontsource/roboto
  npm install react-markdown
  npm install remark-gfm
  npm install github-markdown-css
  npm install rehype-raw
  npm install @mui/x-data-grid
  npm install @mui/x-tree-view
  npm install react-split
  npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-placeholder
  npm install @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-image
  npm install rehype-sanitize
  npm i isomorphic-dompurify

  ```


## 설정
- package.json에 다음 스크립트 추가
  ```
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next export"
  }, 
  ```

- pages/index.js 파일 생성

```
import React from 'react';

const Home = () => {
  return <h1>Welcome to Fine-Tuning Chatbot!</h1>;
};

export default Home;
```

# redocly 사용방법

- Redocly OpenAPI 확장을 설치한다.
- openapi.json파일을 선택하고 CMD+Shipt+P Redocly OpenAPI:Open Preview를 선택하면 문서가 나온다.
- www.redocly.com 로그인한다.







This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
