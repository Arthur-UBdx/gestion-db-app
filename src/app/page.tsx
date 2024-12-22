import React from "react";
import { cookies } from "next/headers";

import styles from "./page.module.css";

import {check_token} from "lib/cookie_auth";

import LoginPage from "components/login_page";
import DatabaseInterfacePanel from "components/database_interface_panel";

export default async function Home() : Promise<JSX.Element> {
  //check for authentication
  const token = await cookies().then((cookieStore) => {
    return cookieStore.get("token")?.value || "";   
  })
  const isTokenValid: boolean = check_token(token);
  if (!isTokenValid) {
    return <LoginPage/>
  }

  return (
    <DatabaseInterfacePanel/>
  )
}
