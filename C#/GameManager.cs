using System.Collections;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public InputActionReference quitGameReference;
    public InputActionReference sceneSwitchReference;
    GameObject XRRig;
    GameObject Player;
    GameObject LoadingCanvas;
    bool _loading = false;

    void Start()
    {
        LoadingCanvas = GameObject.Find("LoadingCanvas");
        LoadingCanvas.SetActive(false);

        XRRig = GameObject.Find("XR Rig");
        Player = GameObject.Find("Player");
        CheckControlScheme();

        OnEnable();
    }

    void Update()
    {
        quitGameReference.action.performed += QuitGame;
        sceneSwitchReference.action.performed += SwitchScene;
    }

    void QuitGame(InputAction.CallbackContext obj)
    {
        MenuLoader();
    }

    void SwitchScene(InputAction.CallbackContext obj)
    {
        MenuLoader();
    }

    void CheckControlScheme()
    {
        if (PlayerPrefs.GetInt("ControlScheme") == 0) {
            XRRig.SetActive(true);
            Player.SetActive(false);
        } else {
            XRRig.SetActive(false);
            Player.SetActive(true);
        }
    }
 
    public void MenuLoader()
    {
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
        LoadingCanvas.SetActive(true);

        if (_loading)
            return;
        
        _loading = true;

        StartCoroutine(LoadAsyncOperation());
    }
 
    IEnumerator LoadAsyncOperation()
    {
        AsyncOperation gameLevel = SceneManager.LoadSceneAsync(0);
        
        gameLevel.allowSceneActivation = false;
 
        while (!gameLevel.isDone)
        {
            if (gameLevel.progress >= 0.9f)
            {
                yield return new WaitForSeconds(5f);
                gameLevel.allowSceneActivation = true;
            }
            yield return null;
        }
    }

    void OnEnable()
    {
        quitGameReference.action.Enable();
        sceneSwitchReference.action.Enable();
    }

    void OnDisable()
    {
        quitGameReference.action.Disable();
        sceneSwitchReference.action.Disable();
    }
}
