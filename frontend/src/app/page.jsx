import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";

export default function Home() {
  return (<>
    <SignOutButton>Signout</SignOutButton>
  </>);
}
