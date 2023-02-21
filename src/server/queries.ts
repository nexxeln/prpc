import { isServer } from "solid-js/web";
import { query$ } from "../prpc/query";

export const add = query$((input: { a: number; b: number }) => {
  const result = input.a + input.b;
  console.log(isServer);
  console.log("add", result);
  return result;
});
