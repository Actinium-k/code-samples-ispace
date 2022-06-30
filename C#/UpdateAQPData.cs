using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class UpdateAQPData : MonoBehaviour
{
    public string URL;

    public Sprite UPARROW;
    public Sprite DOWNARROW;
    public Sprite RIGHTARROW;

    public Transform HumidityFrame;
    public Transform TemperatureFrame;
    public Transform PM25Frame;
    public Transform PM10Frame;
    public Transform NO2Frame;
    public Transform NH3Frame;
    public Transform CO2Frame;
    public Transform COFrame;

    #region Private variables definition
    TextMeshProUGUI HumidityValue;
    Image HumidityIndicator;
    Image HumidityArrow;
    TextMeshProUGUI TemperatureValue;
    Image TemperatureIndicator;
    Image TemperatureArrow;
    TextMeshProUGUI PM25Value;
    Image PM25Indicator;
    Image PM25Arrow;
    TextMeshProUGUI PM10Value;
    Image PM10Indicator;
    Image PM10Arrow;
    TextMeshProUGUI NO2Value;
    Image NO2Indicator;
    Image NO2Arrow;
    TextMeshProUGUI NH3Value;
    Image NH3Indicator;
    Image NH3Arrow;
    TextMeshProUGUI CO2Value;
    Image CO2Indicator;
    Image CO2Arrow;
    TextMeshProUGUI COValue;
    Image COIndicator;
    Image COArrow;
    float OldHumidity = 0f;
    float OldTemperature = 0f;
    float OldPM25 = 0f;
    float OldPM10 = 0f;
    float OldNO2 = 0f;
    float OldNH3 = 0f;
    float OldCO2= 0f;
    float OldCO = 0f;
    #endregion

    Color red = Color.red;
    Color orange = new Color(1f, 0.6f, 0f, 1f);
    Color green = Color.green;
    Color white = Color.white;

    public void Start()
    {
        #region Assign object components to private variables
        HumidityValue = HumidityFrame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        HumidityIndicator = HumidityFrame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        HumidityArrow = HumidityFrame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        TemperatureValue = TemperatureFrame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        TemperatureIndicator = TemperatureFrame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        TemperatureArrow = TemperatureFrame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        PM25Value = PM25Frame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        PM25Indicator = PM25Frame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        PM25Arrow = PM25Frame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        PM10Value = PM10Frame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        PM10Indicator = PM10Frame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        PM10Arrow = PM10Frame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        NO2Value = NO2Frame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        NO2Indicator = NO2Frame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        NO2Arrow = NO2Frame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        NH3Value = NH3Frame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        NH3Indicator = NH3Frame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        NH3Arrow = NH3Frame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        CO2Value = CO2Frame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        CO2Indicator = CO2Frame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        CO2Arrow = CO2Frame.transform.Find("Arrow").gameObject.GetComponent<Image>();

        COValue = COFrame.transform.Find("Value").gameObject.GetComponent<TextMeshProUGUI>();
        COIndicator = COFrame.transform.Find("Indicator").gameObject.GetComponent<Image>();
        COArrow = COFrame.transform.Find("Arrow").gameObject.GetComponent<Image>();
        #endregion

        StartCoroutine("UpdateData");
    }

    IEnumerator UpdateData()
    {

        string json = APIHelper.GetAPIData(URL);
        AQP aqp = JsonUtility.FromJson<AQP>(json);
        
        HumidityValue.text = aqp.humidity.ToString() + "%";
        TemperatureValue.text = aqp.temperature.ToString() + "C";
        PM25Value.text = aqp.pm25.ToString() + " ppm";
        PM10Value.text = aqp.pm10.ToString() + " ppm";
        NO2Value.text = aqp.no2.ToString() + " ppm";
        NH3Value.text = aqp.nh3.ToString() + " ppm";
        CO2Value.text = aqp.co2.ToString() + " ppm";
        COValue.text = aqp.co.ToString() + " ppm";

        HumidityIndicator.color = checkMinMaxColor("humidity", aqp.humidity);
        TemperatureIndicator.color = checkMinMaxColor("temperature", aqp.temperature);
        PM25Indicator.color = checkMinMaxColor("pm25", aqp.pm25);
        PM10Indicator.color = checkMinMaxColor("pm10", aqp.pm10);
        NO2Indicator.color = checkMinMaxColor("no2", aqp.no2);
        NH3Indicator.color = checkMinMaxColor("nh3", aqp.nh3);
        CO2Indicator.color = checkMinMaxColor("co2", aqp.co2);
        COIndicator.color = checkMinMaxColor("co", aqp.co);
        
        UpdateArrows(aqp);

        OldHumidity = aqp.humidity;
        OldTemperature = aqp.temperature;
        OldPM25 = aqp.pm25;
        OldPM10 = aqp.pm10;
        OldNO2 = aqp.no2;
        OldNH3 = aqp.nh3;
        OldCO2 = aqp.co2;
        OldCO = aqp.co;
        
        yield return new WaitForSecondsRealtime(5);
        yield return StartCoroutine("UpdateData");
    }

    void UpdateArrows(AQP aqp) {
        if (aqp.humidity > OldHumidity) {
            HumidityArrow.sprite = UPARROW;
        } else if (aqp.humidity < OldHumidity) {
            HumidityArrow.sprite = DOWNARROW;
        } else {
            HumidityArrow.sprite = RIGHTARROW;
        }

        if (aqp.temperature > OldTemperature) {
            TemperatureArrow.sprite = UPARROW;
        } else if (aqp.temperature < OldTemperature) {
            TemperatureArrow.sprite = DOWNARROW;
        } else {
            TemperatureArrow.sprite = RIGHTARROW;
        }

        if (aqp.pm25 > OldPM25) {
            PM25Arrow.sprite = UPARROW;
        } else if (aqp.pm25 < OldPM25) {
            PM25Arrow.sprite = DOWNARROW;
        } else {
            PM25Arrow.sprite = RIGHTARROW;
        }

        if (aqp.pm10 > OldPM10) {
            PM10Arrow.sprite = UPARROW;
        } else if (aqp.pm10 < OldPM10) {
            PM10Arrow.sprite = DOWNARROW;
        } else {
            PM10Arrow.sprite = RIGHTARROW;
        }

        if (aqp.no2 > OldNO2) {
            NO2Arrow.sprite = UPARROW;
        } else if (aqp.no2 < OldNO2) {
            NO2Arrow.sprite = DOWNARROW;
        } else {
            NO2Arrow.sprite = RIGHTARROW;
        }

        if (aqp.nh3 > OldNH3) {
            NH3Arrow.sprite = UPARROW;
        } else if (aqp.nh3 < OldNH3) {
            NH3Arrow.sprite = DOWNARROW;
        } else {
            NH3Arrow.sprite = RIGHTARROW;
        }

        if (aqp.co2 > OldCO2) {
            CO2Arrow.sprite = UPARROW;
        } else if (aqp.co2 < OldCO2) {
            CO2Arrow.sprite = DOWNARROW;
        } else {
            CO2Arrow.sprite = RIGHTARROW;
        }

        if (aqp.co > OldCO) {
            COArrow.sprite = UPARROW;
        } else if (aqp.co < OldCO) {
            COArrow.sprite = DOWNARROW;
        } else {
            COArrow.sprite = RIGHTARROW;
        }
    }

    Color checkMinMaxColor(string parameter, float value) {
        switch (parameter) {
            case "humidity":
                if (value >= 98) {
                    return red;
                } else if (value >= 80 || value <=30) {
                    return orange;
                } else {
                    return green;
                }
            case "temperature":
                if (value >= 50 || value <-10) {
                    return red;
                } else if (value >= 30 || value <=0) {
                    return orange;
                } else {
                    return green;
                }
            case "pm25":
                if (value >= 100) {
                    return red;
                } else if (value >= 70) {
                    return orange;
                } else {
                    return green;
                }
            case "pm10":
                if (value >= 100) {
                    return red;
                } else if (value >= 70) {
                    return orange;
                } else {
                    return green;
                }
            case "no2":
                if (value >= 1) {
                    return red;
                } else if (value >= 0.6) {
                    return orange;
                } else {
                    return green;
                }
            case "nh3":
                if (value >= 20) {
                    return red;
                } else if (value >= 14) {
                    return orange;
                } else {
                    return green;
                }
            case "co2":
                if (value >= 1500) {
                    return red;
                } else if (value >= 800) {
                    return orange;
                } else {
                    return green;
                }
            case "co":
                if (value >= 9) {
                    return red;
                } else if (value >= 7) {
                    return orange;
                } else {
                    return green;
                }
            default:
                return white;
        }
    }
}
