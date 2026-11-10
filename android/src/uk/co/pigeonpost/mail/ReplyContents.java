package uk.co.pigeonpost.mail;

/** JSON null and missing fields are absent content, never the text "null". */
final class ReplyContents {
 static String text(Object value){return value instanceof String?(String)value:"";}
}
