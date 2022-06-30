using System.Net;
using System.IO;

public static class APIHelper
{
    public static string GetAPIData(string API_URL, string APIKey = null) {
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(API_URL);
        if (APIKey != null) {
            request.Headers.Add("Authorization", "APIKey " + APIKey);
        }
        HttpWebResponse response = (HttpWebResponse)request.GetResponse();
        StreamReader reader = new StreamReader(response.GetResponseStream());
        string json = reader.ReadToEnd();
        response.Close();
        reader.Close();
        return json;
    }
}
