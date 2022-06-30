using System;
using UnityEngine;
using Unity.XR.CoreUtils;
using Esri.HPFramework;
using Esri.ArcGISMapsSDK.Utils.Math;
using Esri.ArcGISMapsSDK.Utils.GeoCoord;

namespace Esri.ArcGISMapsSDK.Components
{
    [DisallowMultipleComponent]
	[RequireComponent(typeof(HPTransform))]
    public class ArcGISVRControllerComponent : MonoBehaviour
    {
		[Tooltip("Set the maximum possible speed in Unity time units")]
		public double MaxSpeed = 2000000.0;
		[Tooltip("Set the minimum possible speed in Unity time units")]
		public double MinSpeed = 4000.0;
		private float TranslationSpeed = 0.0f;

        private XROrigin origin;
		private HPTransform hpTransform;
        private ArcGISMapViewComponent arcGISMapViewComponent;
		private ArcGISLocationComponent locationComponent;

		void OnEnable()
        {
            origin = GetComponentInParent<XROrigin>();
			hpTransform = GetComponent<HPTransform>();
			arcGISMapViewComponent = gameObject.GetComponentInParent<ArcGISMapViewComponent>();
			locationComponent = origin.Camera.GetComponent<ArcGISLocationComponent>();
			// alternative to XROrigin! camera = Camera.main.gameObject;
        }

        void Start()
		{
			if (arcGISMapViewComponent == null)
			{
				Debug.LogError("An ArcGISMapViewComponent could not be found. Please make sure this GameObject is a child of a GameObject with an ArcGISMapViewComponent attached");
				enabled = false;
				return;
			}
		}

        void Update()
        {
			// Get last position within the world
        	var cartesianPosition = new Vector3d(hpTransform.DUniversePosition.x, hpTransform.DUniversePosition.y, hpTransform.DUniversePosition.z);
			
			// Changes speed based on altitude
            var latLon = arcGISMapViewComponent.Scene.FromCartesianPosition(cartesianPosition);
			var altitude = latLon.Altitude;
            UpdateSpeed(altitude);

			// Define movement directions
			var forward = new Vector3d(hpTransform.Forward.x, hpTransform.Forward.y, hpTransform.Forward.z);
			var right = new Vector3d(hpTransform.Right.x, hpTransform.Right.y, hpTransform.Right.z);
			var movDir = Vector3d.zero;
			bool changed = false;

			// Move if one of the axis is active TODO: new input system
			if (Input.GetAxis("Vertical") != 0)
			{
				movDir += forward * Input.GetAxis("Vertical") * TranslationSpeed * Time.deltaTime;
				changed = true;
			}
			if (Input.GetAxis("Horizontal") != 0)
			{
				movDir += right * Input.GetAxis("Horizontal") * TranslationSpeed * Time.deltaTime;
				changed = true;
			}
			if (changed)
			{
				var distance = movDir.Length();
				movDir /= distance;
				cartesianPosition += movDir * distance;
			}

			// Update position with newly calculated coordinates
			hpTransform.DUniversePosition = new DVector3(cartesianPosition.x, cartesianPosition.y, cartesianPosition.z);
        }

		void FixedUpdate()
		{
			// Updates the camera's location based on the headset's look direction
			float heading = origin.Camera.transform.eulerAngles.y;
			float pitch = origin.Camera.transform.eulerAngles.x;
			if (heading <= 180f) {
				pitch = (90f - pitch);
			} else {
				pitch = (90f + Math.Abs(pitch - 360f));
			}
			locationComponent.Rotation = new Rotator(heading, pitch, 0);
		}

        void OnTransformParentChanged()
		{
			OnEnable();
		}

		public void SetupMaxMinSpeed(double max, double min)
		{
			MaxSpeed = max;
			MinSpeed = min;
		}

        void UpdateSpeed(double height)
		{
			var msMaxSpeed = (MaxSpeed * 1000) / 3600;
			var msMinSpeed = (MinSpeed * 1000) / 3600;
			TranslationSpeed = (float)(Math.Pow(Math.Min((height / 100000.0), 1), 2.0) * (msMaxSpeed - msMinSpeed) + msMinSpeed);
		}
    }
}
