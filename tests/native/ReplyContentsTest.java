package uk.co.pigeonpost.mail;
public final class ReplyContentsTest {
 public static void main(String[] args){
  Object jsonNull=new Object(){public String toString(){return "null";}};
  if(!ReplyContents.text(jsonNull).isEmpty()||!ReplyContents.text(null).isEmpty())throw new AssertionError("Absent JSON fields became message text");
  if(!"Hello Owen".equals(ReplyContents.text("Hello Owen")))throw new AssertionError("Text reply changed");
  if(!"null".equals(ReplyContents.text("null")))throw new AssertionError("A deliberately typed note must survive");
  if(!ReplyContents.text(123).isEmpty())throw new AssertionError("Non-text value accepted");
 }
}
