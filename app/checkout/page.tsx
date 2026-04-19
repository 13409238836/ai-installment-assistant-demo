import { redirect } from "next/navigation"

/** 结算已改为首页 AI 面板内的弹窗；保留此路由避免旧书签/外链出现 404 */
export default function CheckoutRedirectPage() {
  redirect("/")
}
