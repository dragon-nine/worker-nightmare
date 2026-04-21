package com.dragonnine.game01;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.*;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "BillingPlugin";
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                Log.d(TAG, "Billing setup: " + result.getResponseCode());
            }

            @Override
            public void onBillingServiceDisconnected() {
                Log.d(TAG, "Billing disconnected");
            }
        });
    }

    @PluginMethod()
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null) {
            call.reject("productId is required");
            return;
        }

        pendingPurchaseCall = call;

        // 상품 정보 조회
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(List.of(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            ))
            .build();

        billingClient.queryProductDetailsAsync(params, (result, productDetailsList) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || productDetailsList.isEmpty()) {
                Log.e(TAG, "Query failed: " + result.getDebugMessage());
                call.reject("Product not found: " + result.getDebugMessage());
                pendingPurchaseCall = null;
                return;
            }

            ProductDetails details = productDetailsList.get(0);
            Activity activity = getActivity();

            List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
            productDetailsParamsList.add(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details)
                    .build()
            );

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build();

            billingClient.launchBillingFlow(activity, flowParams);
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                // 구매 확인 (acknowledge)
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
                    && !purchase.isAcknowledged()) {
                    AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken())
                        .build();
                    billingClient.acknowledgePurchase(ackParams, ackResult -> {
                        Log.d(TAG, "Acknowledge: " + ackResult.getResponseCode());
                    });
                }
            }

            if (pendingPurchaseCall != null) {
                JSObject ret = new JSObject();
                ret.put("purchased", true);
                pendingPurchaseCall.resolve(ret);
                pendingPurchaseCall = null;
            }
        } else if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (pendingPurchaseCall != null) {
                JSObject ret = new JSObject();
                ret.put("purchased", false);
                pendingPurchaseCall.resolve(ret);
                pendingPurchaseCall = null;
            }
        } else {
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("Purchase failed: " + result.getDebugMessage());
                pendingPurchaseCall = null;
            }
        }
    }

    @PluginMethod()
    public void restorePurchases(PluginCall call) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();

        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            boolean hasAdRemove = false;
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
                    && purchase.getProducts().contains("ad_remove")) {
                    hasAdRemove = true;
                    break;
                }
            }
            JSObject ret = new JSObject();
            ret.put("adRemoved", hasAdRemove);
            call.resolve(ret);
        });
    }
}
